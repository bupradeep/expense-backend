const db = require('../utils/db');
const queries = require('../utils/expenseQueries');
const { executeQuery, executeStoredProcedure } = require('../utils/queryExecutor');

async function createExpense(data) {
  validateCreateExpense(data);

  const pool = await db.getPool();
  const transaction = new db.sql.Transaction(pool);

  try {
    await transaction.begin();

    const claimResult = await new db.sql.Request(transaction)
      .input('ClaimNumber', db.sql.VarChar(50), data.claimNumber)
      .input('EmployeeId', db.sql.Int, data.employeeId)
      .input('DepartmentId', db.sql.Int, data.departmentId)
      .input('ProjectId', db.sql.Int, data.projectId || null)
      .input('ClaimDate', db.sql.Date, data.claimDate || new Date())
      .input('Currency', db.sql.VarChar(10), data.currency || 'INR')
      .input('BusinessPurpose', db.sql.VarChar(500), data.businessPurpose)
      .input('Location', db.sql.VarChar(150), data.location || null)
      .input('PaymentMethod', db.sql.VarChar(50), data.paymentMethod || null)
      .input('Remarks', db.sql.VarChar(1000), data.remarks || null)
      .input('CreatedBy', db.sql.Int, data.createdBy)
      .query(queries.insertClaim);

    const claimId = claimResult.recordset[0].ExpenseClaimId;

    for (const item of data.items) {
      await new db.sql.Request(transaction)
        .input('ExpenseClaimId', db.sql.Int, claimId)
        .input('CategoryId', db.sql.Int, item.categoryId)
        .input('ExpenseDate', db.sql.Date, item.expenseDate)
        .input('Amount', db.sql.Decimal(18, 2), item.amount)
        .input('Currency', db.sql.VarChar(10), item.currency || data.currency || 'INR')
        .input('MerchantName', db.sql.VarChar(150), item.merchantName || null)
        .input('Description', db.sql.VarChar(500), item.description || null)
        .input('BusinessPurpose', db.sql.VarChar(500), item.businessPurpose || null)
        .input('PaymentMethod', db.sql.VarChar(50), item.paymentMethod || null)
        .input('IsPolicyException', db.sql.Bit, item.isPolicyException || false)
        .input('PolicyExceptionReason', db.sql.VarChar(1000), item.policyExceptionReason || null)
        .input('CreatedBy', db.sql.Int, data.createdBy)
        .query(queries.insertExpenseItem);
    }

    await new db.sql.Request(transaction)
      .input('ExpenseClaimId', db.sql.Int, claimId)
      .query(queries.recalculateClaimTotal);

    await new db.sql.Request(transaction)
      .input('UserId', db.sql.Int, data.createdBy)
      .input('ExpenseClaimId', db.sql.Int, claimId)
      .input('Action', db.sql.VarChar(100), 'CREATE_CLAIM')
      .input('PreviousStatus', db.sql.VarChar(50), null)
      .input('NewStatus', db.sql.VarChar(50), 'Draft')
      .input('Comments', db.sql.VarChar(1000), 'Expense claim created')
      .query(queries.insertAuditLog);

    await transaction.commit();

    return getExpenseById(claimId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function getExpenses(filters) {
  const result = await executeQuery(queries.getClaims, {
    EmployeeId: { type: db.sql.Int, value: filters.employeeId || null },
    Status: { type: db.sql.VarChar(50), value: filters.status || null },
    DepartmentId: { type: db.sql.Int, value: filters.departmentId || null }
  });

  return result.recordset;
}

async function getExpenseById(id) {
  const pool = await db.getPool();

  const claim = await new db.sql.Request(pool)
    .input('ExpenseClaimId', db.sql.Int, id)
    .query(queries.getClaimById);

  if (!claim.recordset.length) {
    throw createError(404, 'Expense claim not found');
  }

  const items = await new db.sql.Request(pool)
    .input('ExpenseClaimId', db.sql.Int, id)
    .query(queries.getItemsByClaimId);

  const receipts = await new db.sql.Request(pool)
    .input('ExpenseClaimId', db.sql.Int, id)
    .query(queries.getReceiptsByClaimId);

  return {
    ...claim.recordset[0],
    items: items.recordset,
    receipts: receipts.recordset
  };
}

async function updateExpense(id, data) {
  const existing = await getExpenseById(id);

  if (existing.Status !== 'Draft' && existing.Status !== 'Sent Back') {
    throw createError(400, 'Only Draft or Sent Back claims can be updated');
  }

  const pool = await db.getPool();

  await new db.sql.Request(pool)
    .input('ExpenseClaimId', db.sql.Int, id)
    .input('BusinessPurpose', db.sql.VarChar(500), data.businessPurpose)
    .input('Location', db.sql.VarChar(150), data.location || null)
    .input('PaymentMethod', db.sql.VarChar(50), data.paymentMethod || null)
    .input('Remarks', db.sql.VarChar(1000), data.remarks || null)
    .input('UpdatedBy', db.sql.Int, data.updatedBy)
    .query(queries.updateClaim);

  if (Array.isArray(data.items)) {
    await new db.sql.Request(pool)
      .input('ExpenseClaimId', db.sql.Int, id)
      .query(queries.deleteItems);

    for (const item of data.items) {
      await new db.sql.Request(pool)
        .input('ExpenseClaimId', db.sql.Int, id)
        .input('CategoryId', db.sql.Int, item.categoryId)
        .input('ExpenseDate', db.sql.Date, item.expenseDate)
        .input('Amount', db.sql.Decimal(18, 2), item.amount)
        .input('Currency', db.sql.VarChar(10), item.currency || 'INR')
        .input('MerchantName', db.sql.VarChar(150), item.merchantName || null)
        .input('Description', db.sql.VarChar(500), item.description || null)
        .input('BusinessPurpose', db.sql.VarChar(500), item.businessPurpose || null)
        .input('PaymentMethod', db.sql.VarChar(50), item.paymentMethod || null)
        .input('IsPolicyException', db.sql.Bit, item.isPolicyException || false)
        .input('PolicyExceptionReason', db.sql.VarChar(1000), item.policyExceptionReason || null)
        .input('CreatedBy', db.sql.Int, data.updatedBy)
        .query(queries.insertExpenseItem);
    }

    await new db.sql.Request(pool)
      .input('ExpenseClaimId', db.sql.Int, id)
      .query(queries.recalculateClaimTotal);
  }

  return getExpenseById(id);
}

async function deleteExpense(id, data) {
  const existing = await getExpenseById(id);

  if (existing.Status !== 'Draft') {
    throw createError(400, 'Only Draft claims can be deleted');
  }

  const pool = await db.getPool();

  await new db.sql.Request(pool)
    .input('ExpenseClaimId', db.sql.Int, id)
    .input('UpdatedBy', db.sql.Int, data.updatedBy || data.createdBy || null)
    .query(queries.softDeleteClaim);

  return { message: 'Expense claim deleted successfully' };
}

async function submitExpense(id, data) {
  const existing = await getExpenseById(id);

  if (existing.Status !== 'Draft' && existing.Status !== 'Sent Back') {
    throw createError(400, 'Only Draft or Sent Back claims can be submitted');
  }

  if (!existing.items.length) {
    throw createError(400, 'At least one expense item is required');
  }

  const policyResult = await validatePolicies(existing.items);

  const newStatus = policyResult.hasException
    ? 'Submitted'
    : 'Submitted';

  const pool = await db.getPool();

  await new db.sql.Request(pool)
    .input('ExpenseClaimId', db.sql.Int, id)
    .input('Status', db.sql.VarChar(50), newStatus)
    .input('UpdatedBy', db.sql.Int, data.userId)
    .query(queries.submitClaim);

  await new db.sql.Request(pool)
    .input('UserId', db.sql.Int, data.userId)
    .input('ExpenseClaimId', db.sql.Int, id)
    .input('Action', db.sql.VarChar(100), 'SUBMIT_CLAIM')
    .input('PreviousStatus', db.sql.VarChar(50), existing.Status)
    .input('NewStatus', db.sql.VarChar(50), newStatus)
    .input('Comments', db.sql.VarChar(1000),
      policyResult.hasException
        ? 'Claim submitted with policy exception'
        : 'Claim submitted')
    .query(queries.insertAuditLog);

  return {
    message: 'Expense claim submitted successfully',
    policyValidation: policyResult,
    status: newStatus
  };
}

async function validatePolicies(items) {
  const pool = await db.getPool();
  const violations = [];

  for (const item of items) {
    const result = await new db.sql.Request(pool)
      .input('CategoryId', db.sql.Int, item.CategoryId)
      .query(queries.getPolicyByCategory);

    if (!result.recordset.length) continue;

    const policy = result.recordset[0];

    if (
      policy.MaximumAmount > 0 &&
      Number(item.Amount) > Number(policy.MaximumAmount)
    ) {
      violations.push({
        expenseItemId: item.ExpenseItemId,
        categoryId: item.CategoryId,
        amount: item.Amount,
        limit: policy.MaximumAmount,
        reason: `${policy.PolicyName} exceeded`
      });
    }
  }

  return {
    hasException: violations.length > 0,
    violations
  };
}

async function getExpenseHistory(id) {
  const result = await executeQuery(queries.getApprovalHistory, {
    ExpenseClaimId: { type: db.sql.Int, value: id }
  });

  return result.recordset;
}

async function getReceipts(id) {
  const result = await executeQuery(queries.getReceiptsByClaimId, {
    ExpenseClaimId: { type: db.sql.Int, value: id }
  });

  return result.recordset;
}

function validateCreateExpense(data) {
  if (!data.employeeId) throw createError(400, 'employeeId is required');
  if (!data.departmentId) throw createError(400, 'departmentId is required');
  if (!data.businessPurpose) throw createError(400, 'businessPurpose is required');
  if (!data.createdBy) throw createError(400, 'createdBy is required');

  if (!Array.isArray(data.items) || !data.items.length) {
    throw createError(400, 'At least one expense item is required');
  }

  for (const item of data.items) {
    if (!item.categoryId) throw createError(400, 'categoryId is required');
    if (!item.expenseDate) throw createError(400, 'expenseDate is required');
    if (!item.amount || Number(item.amount) <= 0) {
      throw createError(400, 'Expense amount must be greater than zero');
    }
  }
}

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  submitExpense,
  getExpenseHistory,
  getReceipts
};
