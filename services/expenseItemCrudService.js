const { ExpenseItem, ExpenseClaim } = require('../models');
const { createError } = require('../utils/httpError');

// Mirrors expenseService.js's assertIsOwnerOrAdmin / assertCanViewClaim -- items are a
// sub-resource of a claim, so they're gated by the same ownership (and, for writes, status)
// rules as the claim itself, rather than being independently accessible by anyone authenticated.
const APPROVER_ROLES = ['Manager', 'DepartmentHead', 'Finance'];

async function loadClaimOrThrow(expenseClaimId) {
  const claim = await ExpenseClaim.findByPk(expenseClaimId, { attributes: ['ExpenseClaimId', 'EmployeeId', 'Status'] });

  if (!claim) {
    throw createError(404, 'Expense claim not found');
  }

  return claim;
}

async function assertCanViewClaim(expenseClaimId, actor) {
  if (!actor) return;

  const claim = await loadClaimOrThrow(expenseClaimId);

  if (claim.EmployeeId === actor.userId || actor.role === 'Admin' || APPROVER_ROLES.includes(actor.role)) {
    return;
  }

  throw createError(403, 'You do not have permission to view this expense claim');
}

async function assertCanModifyClaim(expenseClaimId, actor) {
  if (!actor) return;

  const claim = await loadClaimOrThrow(expenseClaimId);

  if (actor.role !== 'Admin') {
    if (claim.EmployeeId !== actor.userId) {
      throw createError(403, 'You can only modify items on your own expense claims');
    }

    if (claim.Status !== 'Draft' && claim.Status !== 'Sent Back') {
      throw createError(400, 'Only Draft or Sent Back claims can be modified');
    }
  }
}

async function createExpenseItem(data, actor) {
  validate(data);
  if (!data.createdBy) throw createError(400, 'createdBy is required');

  await assertCanModifyClaim(data.expenseClaimId, actor);

  const item = await ExpenseItem.create({
    ExpenseClaimId: data.expenseClaimId,
    CategoryId: data.categoryId,
    ExpenseDate: data.expenseDate,
    Amount: data.amount,
    MerchantName: data.merchantName || null,
    Description: data.description || null,
    BusinessPurpose: data.businessPurpose || null,
    PaymentMethod: data.paymentMethod || null,
    IsPolicyException: data.isPolicyException || false,
    PolicyExceptionReason: data.policyExceptionReason || null,
    CreatedAt: new Date(),
    CreatedBy: data.createdBy
  });

  await recalculateClaimTotal(data.expenseClaimId, data.createdBy);

  return getExpenseItemById(item.ExpenseItemId, actor);
}

async function getExpenseItems(filters = {}, actor) {
  if (!filters.expenseClaimId) {
    if (actor && actor.role !== 'Admin') {
      throw createError(400, 'expenseClaimId is required');
    }

    return ExpenseItem.findAll({ order: [['ExpenseItemId', 'ASC']] });
  }

  await assertCanViewClaim(filters.expenseClaimId, actor);

  return ExpenseItem.findAll({ where: { ExpenseClaimId: filters.expenseClaimId }, order: [['ExpenseItemId', 'ASC']] });
}

async function getExpenseItemById(id, actor) {
  const item = await ExpenseItem.findByPk(id);

  if (!item) {
    throw createError(404, 'Expense item not found');
  }

  await assertCanViewClaim(item.ExpenseClaimId, actor);

  return item;
}

async function updateExpenseItem(id, data, actor) {
  const item = await getExpenseItemById(id, actor);
  validateForUpdate(data);

  await assertCanModifyClaim(item.ExpenseClaimId, actor);

  await item.update({
    CategoryId: data.categoryId,
    ExpenseDate: data.expenseDate,
    Amount: data.amount,
    MerchantName: data.merchantName || null,
    Description: data.description || null,
    BusinessPurpose: data.businessPurpose || null,
    PaymentMethod: data.paymentMethod || null,
    IsPolicyException: data.isPolicyException || false,
    PolicyExceptionReason: data.policyExceptionReason || null,
    UpdatedAt: new Date(),
    UpdatedBy: data.updatedBy || null
  });

  await recalculateClaimTotal(item.ExpenseClaimId, data.updatedBy);

  return getExpenseItemById(id, actor);
}

async function deleteExpenseItem(id, actor) {
  const item = await getExpenseItemById(id, actor);
  const expenseClaimId = item.ExpenseClaimId;

  await assertCanModifyClaim(expenseClaimId, actor);

  await item.destroy();

  await recalculateClaimTotal(expenseClaimId, actor ? actor.userId : null);

  return { message: 'Expense item deleted successfully' };
}

async function recalculateClaimTotal(expenseClaimId, updatedBy) {
  const total = await ExpenseItem.sum('Amount', { where: { ExpenseClaimId: expenseClaimId } });

  await ExpenseClaim.update(
    { TotalAmount: total || 0, UpdatedAt: new Date(), UpdatedBy: updatedBy || null },
    { where: { ExpenseClaimId: expenseClaimId } }
  );
}

function validate(data) {
  if (!data.expenseClaimId) throw createError(400, 'expenseClaimId is required');
  validateForUpdate(data);
}

function validateForUpdate(data) {
  if (!data.categoryId) throw createError(400, 'categoryId is required');
  if (!data.expenseDate) throw createError(400, 'expenseDate is required');
  if (!data.amount || Number(data.amount) <= 0) {
    throw createError(400, 'amount must be greater than zero');
  }
}

module.exports = {
  createExpenseItem,
  getExpenseItems,
  getExpenseItemById,
  updateExpenseItem,
  deleteExpenseItem
};
