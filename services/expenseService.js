const { Op } = require('sequelize');
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
  ExpenseCategory,
  ExpenseClaimComment
} = require('../models');
const { getPagination, toPagedResult } = require('../utils/pagination');
const notificationService = require('./notificationService');
const approvalService = require('./approvalService');

const COMMENT_ROLE_STATUS_MAP = {
  Manager: 'Submitted',
  DepartmentHead: 'Department Head Review',
  Finance: 'Finance Review'
};

async function createExpense(data) {
  validateCreateExpense(data);
  await assertCanCreateClaim(data.employeeId);

  return sequelize.transaction(async (transaction) => {
    const claim = await ExpenseClaim.create({
      ClaimNumber: data.claimNumber,
      EmployeeId: data.employeeId,
      DepartmentId: data.departmentId,
      ProjectId: data.projectId || null,
      ClaimDate: data.claimDate || new Date(),
      TotalAmount: 0,
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

    await recalculateClaimTotal(claim.ExpenseClaimId, data.createdBy, transaction);

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
  if (filters.departmentId) where.DepartmentId = filters.departmentId;

  if (filters.status) {
    where.Status = filters.status;
  } else if (filters.excludeDeleted === 'true' || filters.excludeDeleted === true) {
    where.Status = { [Op.ne]: 'Deleted' };
  }

  if (filters.fromDate || filters.toDate) {
    where.ClaimDate = {};
    if (filters.fromDate) where.ClaimDate[Op.gte] = filters.fromDate;
    if (filters.toDate) where.ClaimDate[Op.lte] = filters.toDate;
  }

  const include = [
    { model: User, as: 'Employee' },
    { model: Department },
    { model: Project, required: false }
  ];

  const pagination = getPagination(filters);

  if (!pagination) {
    return ExpenseClaim.findAll({ where, include, order: [['CreatedAt', 'DESC']] });
  }

  const { count, rows } = await ExpenseClaim.findAndCountAll({
    where,
    include,
    order: [['CreatedAt', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true
  });

  return toPagedResult(pagination.page, pagination.pageSize, count, rows);
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
      { model: ExpenseReceipt, as: 'Receipts' },
      {
        model: ExpenseClaimComment,
        as: 'Comments',
        include: [{ model: User, as: 'User' }],
        separate: true,
        order: [['CreatedAt', 'ASC']]
      }
    ]
  });

  if (!claim) {
    throw createError(404, 'Expense claim not found');
  }

  return claim;
}

async function updateExpense(id, data, actor) {
  const existing = await getExpenseById(id);

  assertIsOwnerOrAdmin(existing, actor);

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

  let itemChangeSummary = '';

  if (Array.isArray(data.items)) {
    // Reconcile in place (matched by position) rather than destroy-all-then-recreate, so that
    // items which still exist after the edit keep their ExpenseItemId and stay linked to any
    // receipts already uploaded against them (ExpenseReceipts.ExpenseItemId has a NO_ACTION FK,
    // so destroying an item that still has receipts would otherwise fail the whole update).
    const existingItems = await ExpenseItem.findAll({
      where: { ExpenseClaimId: id },
      order: [['ExpenseItemId', 'ASC']]
    });

    const reusableCount = Math.min(existingItems.length, data.items.length);
    const addedCount = data.items.length - reusableCount;
    const removedCount = existingItems.length - reusableCount;
    itemChangeSummary = ` (${reusableCount} updated, ${addedCount} added, ${removedCount} removed)`;

    for (let i = 0; i < reusableCount; i++) {
      const item = data.items[i];
      await ExpenseItem.update({
        CategoryId: item.categoryId,
        ExpenseDate: item.expenseDate,
        Amount: item.amount,
        MerchantName: item.merchantName || null,
        Description: item.description || null,
        BusinessPurpose: item.businessPurpose || null,
        PaymentMethod: item.paymentMethod || null,
        IsPolicyException: item.isPolicyException || false,
        PolicyExceptionReason: item.policyExceptionReason || null,
        UpdatedAt: new Date(),
        UpdatedBy: data.updatedBy
      }, { where: { ExpenseItemId: existingItems[i].ExpenseItemId } });
    }

    if (existingItems.length > reusableCount) {
      const removedItemIds = existingItems.slice(reusableCount).map((item) => item.ExpenseItemId);
      await ExpenseReceipt.destroy({ where: { ExpenseItemId: removedItemIds } });
      await ExpenseItem.destroy({ where: { ExpenseItemId: removedItemIds } });
    }

    for (let i = reusableCount; i < data.items.length; i++) {
      const item = data.items[i];
      await ExpenseItem.create({
        ExpenseClaimId: id,
        CategoryId: item.categoryId,
        ExpenseDate: item.expenseDate,
        Amount: item.amount,
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

    await recalculateClaimTotal(id, data.updatedBy);
  }

  await AuditLog.create({
    UserId: data.updatedBy,
    ExpenseClaimId: id,
    Action: 'UPDATE_CLAIM',
    PreviousStatus: existing.Status,
    NewStatus: existing.Status,
    Comments: `Expense claim updated${itemChangeSummary}`,
    CreatedAt: new Date(),
    CreatedBy: data.updatedBy
  });

  return getExpenseById(id);
}

async function deleteExpense(id, data, actor) {
  const existing = await getExpenseById(id);

  assertIsOwnerOrAdmin(existing, actor);

  if (existing.Status !== 'Draft') {
    throw createError(400, 'Only Draft claims can be deleted');
  }

  const deletedBy = data.updatedBy || data.createdBy || null;

  await ExpenseClaim.update({
    Status: 'Deleted',
    UpdatedAt: new Date(),
    UpdatedBy: deletedBy
  }, { where: { ExpenseClaimId: id } });

  if (deletedBy) {
    await AuditLog.create({
      UserId: deletedBy,
      ExpenseClaimId: id,
      Action: 'DELETE_CLAIM',
      PreviousStatus: existing.Status,
      NewStatus: 'Deleted',
      Comments: 'Expense claim deleted',
      CreatedAt: new Date(),
      CreatedBy: deletedBy
    });
  }

  return { message: 'Expense claim deleted successfully' };
}

async function submitExpense(id, data, actor) {
  const existing = await getExpenseById(id);

  assertIsOwnerOrAdmin(existing, actor);

  if (existing.Status !== 'Draft' && existing.Status !== 'Sent Back') {
    throw createError(400, 'Only Draft or Sent Back claims can be submitted');
  }

  if (!existing.Items.length) {
    throw createError(400, 'At least one expense item is required');
  }

  const policyResult = await validatePolicies(existing.Items);

  // The starting stage is driven by the amount-banded ApprovalRule (level 1) -- e.g. a small
  // claim can route straight to Finance and skip Manager entirely. With no matching rule,
  // Manager remains the default starting stage.
  const startingStage = await approvalService.getStartingStage(existing.TotalAmount);
  const newStatus = startingStage.status;
  const submittedDate = new Date();

  await ExpenseClaim.update({
    Status: newStatus,
    ClaimDate: submittedDate,
    SubmittedAt: submittedDate,
    UpdatedAt: submittedDate,
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

  await notificationService.notifySubmitted(id);
  // Routes to the employee's specifically assigned manager, or auto-approves the Manager
  // stage (with an ApprovalHistory comment explaining why) if none is mapped.
  await approvalService.routeInitialApproval(id);

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

async function getComments(id) {
  return ExpenseClaimComment.findAll({
    where: { ExpenseClaimId: id },
    include: [{ model: User, as: 'User' }],
    order: [['CreatedAt', 'ASC']]
  });
}

async function addComment(id, data) {
  const claim = await getExpenseById(id);

  if (!data.userId) throw createError(400, 'userId is required');
  if (!data.commentText || !data.commentText.trim()) throw createError(400, 'commentText is required');

  await assertCanComment(claim, data.userId);

  const commentText = data.commentText.trim();

  await ExpenseClaimComment.create({
    ExpenseClaimId: id,
    UserId: data.userId,
    CommentText: commentText,
    CreatedAt: new Date()
  });

  await AuditLog.create({
    UserId: data.userId,
    ExpenseClaimId: id,
    Action: 'ADD_COMMENT',
    PreviousStatus: claim.Status,
    NewStatus: claim.Status,
    Comments: commentText,
    CreatedAt: new Date(),
    CreatedBy: data.userId
  });

  return getComments(id);
}

function assertIsOwnerOrAdmin(claim, actor) {
  if (!actor) {
    // No authenticated actor was supplied (e.g. an internal/service call) -- nothing to check.
    return;
  }

  if (claim.EmployeeId === actor.userId || actor.role === 'Admin') {
    return;
  }

  throw createError(403, 'You can only act on your own expense claims');
}

async function assertCanComment(claim, userId) {
  const user = await User.findByPk(userId);
  if (!user) throw createError(404, 'User not found');

  if (user.Role === 'Admin') return;
  if (claim.EmployeeId === user.UserId) return;
  if (COMMENT_ROLE_STATUS_MAP[user.Role] === claim.Status) return;

  const priorAction = await ApprovalHistory.findOne({
    where: { ExpenseClaimId: claim.ExpenseClaimId, ApproverId: user.UserId }
  });
  if (priorAction) return;

  throw createError(403, 'You do not have permission to comment on this claim');
}

async function recalculateClaimTotal(expenseClaimId, updatedBy, transaction) {
  const total = await ExpenseItem.sum('Amount', {
    where: { ExpenseClaimId: expenseClaimId },
    transaction
  });

  await ExpenseClaim.update(
    { TotalAmount: total || 0, UpdatedAt: new Date(), UpdatedBy: updatedBy || null },
    { where: { ExpenseClaimId: expenseClaimId }, transaction }
  );
}

async function assertCanCreateClaim(employeeId) {
  const employee = await User.findByPk(employeeId);

  if (!employee) {
    throw createError(400, 'employeeId does not match an existing user');
  }

  if (employee.Role === 'Finance') {
    throw createError(403, 'Finance users cannot create expense claims - they can only review claims pending their approval');
  }
}

function validateCreateExpense(data) {
  if (!data.employeeId) throw createError(400, 'employeeId is required');
  if (!data.departmentId) throw createError(400, 'departmentId is required');
  if (!data.projectId) throw createError(400, 'projectId is required');
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
  getReceipts,
  getComments,
  addComment
};
