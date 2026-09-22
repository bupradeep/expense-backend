const {
  sequelize,
  ExpenseClaim,
  ExpenseItem,
  ExpenseReceipt,
  ApprovalHistory,
  AuditLog,
  PolicyRule,
  User,
  Department,
  Project,
  ExpenseCategory
} = require('../models');

async function createExpense(data) {
  validateCreateExpense(data);

  return sequelize.transaction(async (transaction) => {
    const claim = await ExpenseClaim.create({
      ClaimNumber: data.claimNumber,
      EmployeeId: data.employeeId,
      DepartmentId: data.departmentId,
      ProjectId: data.projectId || null,
      ClaimDate: data.claimDate || new Date(),
      TotalAmount: 0,
      Currency: data.currency || 'INR',
      BusinessPurpose: data.businessPurpose,
      Location: data.location || null,
      PaymentMethod: data.paymentMethod || null,
      Remarks: data.remarks || null,
      Status: 'Draft',
      CreatedAt: new Date(),
      CreatedBy: data.createdBy
    }, { transaction });

    for (const item of data.items) {
      await ExpenseItem.create({
        ExpenseClaimId: claim.ExpenseClaimId,
        CategoryId: item.categoryId,
        ExpenseDate: item.expenseDate,
        Amount: item.amount,
        Currency: item.currency || data.currency || 'INR',
        MerchantName: item.merchantName || null,
        Description: item.description || null,
        BusinessPurpose: item.businessPurpose || null,
        PaymentMethod: item.paymentMethod || null,
        IsPolicyException: item.isPolicyException || false,
        PolicyExceptionReason: item.policyExceptionReason || null,
        CreatedAt: new Date(),
        CreatedBy: data.createdBy
      }, { transaction });
    }

    await recalculateClaimTotal(claim.ExpenseClaimId, transaction);

    await AuditLog.create({
      UserId: data.createdBy,
      ExpenseClaimId: claim.ExpenseClaimId,
      Action: 'CREATE_CLAIM',
      PreviousStatus: null,
      NewStatus: 'Draft',
      Comments: 'Expense claim created',
      CreatedAt: new Date(),
      CreatedBy: data.createdBy
    }, { transaction });

    return claim.ExpenseClaimId;
  }).then((claimId) => getExpenseById(claimId));
}

async function getExpenses(filters) {
  const where = {};
  if (filters.employeeId) where.EmployeeId = filters.employeeId;
  if (filters.status) where.Status = filters.status;
  if (filters.departmentId) where.DepartmentId = filters.departmentId;

  return ExpenseClaim.findAll({
    where,
    include: [
      { model: User, as: 'Employee' },
      { model: Department },
      { model: Project, required: false }
    ],
    order: [['CreatedAt', 'DESC']]
  });
}

async function getExpenseById(id) {
  const claim = await ExpenseClaim.findByPk(id, {
    include: [
      { model: User, as: 'Employee' },
      { model: Department },
      { model: Project, required: false },
      {
        model: ExpenseItem,
        as: 'Items',
        include: [{ model: ExpenseCategory }]
      },
      { model: ExpenseReceipt, as: 'Receipts' }
    ]
  });

  if (!claim) {
    throw createError(404, 'Expense claim not found');
  }

  return claim;
}

async function updateExpense(id, data) {
  const existing = await getExpenseById(id);

  if (existing.Status !== 'Draft' && existing.Status !== 'Sent Back') {
    throw createError(400, 'Only Draft or Sent Back claims can be updated');
  }

  await ExpenseClaim.update({
    BusinessPurpose: data.businessPurpose,
    Location: data.location || null,
    PaymentMethod: data.paymentMethod || null,
    Remarks: data.remarks || null,
    UpdatedAt: new Date(),
    UpdatedBy: data.updatedBy
  }, { where: { ExpenseClaimId: id } });

  if (Array.isArray(data.items)) {
    await ExpenseItem.destroy({ where: { ExpenseClaimId: id } });

    for (const item of data.items) {
      await ExpenseItem.create({
        ExpenseClaimId: id,
        CategoryId: item.categoryId,
        ExpenseDate: item.expenseDate,
        Amount: item.amount,
        Currency: item.currency || 'INR',
        MerchantName: item.merchantName || null,
        Description: item.description || null,
        BusinessPurpose: item.businessPurpose || null,
        PaymentMethod: item.paymentMethod || null,
        IsPolicyException: item.isPolicyException || false,
        PolicyExceptionReason: item.policyExceptionReason || null,
        CreatedAt: new Date(),
        CreatedBy: data.updatedBy
      });
    }

    await recalculateClaimTotal(id);
  }

  return getExpenseById(id);
}

async function deleteExpense(id, data) {
  const existing = await getExpenseById(id);

  if (existing.Status !== 'Draft') {
    throw createError(400, 'Only Draft claims can be deleted');
  }

  await ExpenseClaim.update({
    Status: 'Deleted',
    UpdatedAt: new Date(),
    UpdatedBy: data.updatedBy || data.createdBy || null
  }, { where: { ExpenseClaimId: id } });

  return { message: 'Expense claim deleted successfully' };
}

async function submitExpense(id, data) {
  const existing = await getExpenseById(id);

  if (existing.Status !== 'Draft' && existing.Status !== 'Sent Back') {
    throw createError(400, 'Only Draft or Sent Back claims can be submitted');
  }

  if (!existing.Items.length) {
    throw createError(400, 'At least one expense item is required');
  }

  const policyResult = await validatePolicies(existing.Items);

  const newStatus = 'Submitted';

  await ExpenseClaim.update({
    Status: newStatus,
    SubmittedAt: new Date(),
    UpdatedAt: new Date(),
    UpdatedBy: data.userId
  }, { where: { ExpenseClaimId: id } });

  await AuditLog.create({
    UserId: data.userId,
    ExpenseClaimId: id,
    Action: 'SUBMIT_CLAIM',
    PreviousStatus: existing.Status,
    NewStatus: newStatus,
    Comments: policyResult.hasException
      ? 'Claim submitted with policy exception'
      : 'Claim submitted',
    CreatedAt: new Date(),
    CreatedBy: data.userId
  });

  return {
    message: 'Expense claim submitted successfully',
    policyValidation: policyResult,
    status: newStatus
  };
}

async function validatePolicies(items) {
  const violations = [];

  for (const item of items) {
    const policy = await PolicyRule.findOne({
      where: { CategoryId: item.CategoryId, IsActive: true },
      order: [['PolicyRuleId', 'DESC']]
    });

    if (!policy) continue;

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
  return ApprovalHistory.findAll({
    where: { ExpenseClaimId: id },
    include: [{ model: User, as: 'Approver' }],
    order: [['ActionDate', 'ASC']]
  });
}

async function getReceipts(id) {
  return ExpenseReceipt.findAll({
    where: { ExpenseClaimId: id },
    order: [['CreatedAt', 'DESC']]
  });
}

async function recalculateClaimTotal(expenseClaimId, transaction) {
  const total = await ExpenseItem.sum('Amount', {
    where: { ExpenseClaimId: expenseClaimId },
    transaction
  });

  await ExpenseClaim.update(
    { TotalAmount: total || 0, UpdatedAt: new Date() },
    { where: { ExpenseClaimId: expenseClaimId }, transaction }
  );
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
