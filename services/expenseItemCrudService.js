const { ExpenseItem, ExpenseClaim } = require('../models');

async function createExpenseItem(data) {
  validate(data);
  if (!data.createdBy) throw createError(400, 'createdBy is required');

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

  return getExpenseItemById(item.ExpenseItemId);
}

async function getExpenseItems(filters = {}) {
  const where = {};
  if (filters.expenseClaimId) where.ExpenseClaimId = filters.expenseClaimId;

  return ExpenseItem.findAll({ where, order: [['ExpenseItemId', 'ASC']] });
}

async function getExpenseItemById(id) {
  const item = await ExpenseItem.findByPk(id);

  if (!item) {
    throw createError(404, 'Expense item not found');
  }

  return item;
}

async function updateExpenseItem(id, data) {
  const item = await getExpenseItemById(id);
  validateForUpdate(data);

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

  return getExpenseItemById(id);
}

async function deleteExpenseItem(id, deletedBy) {
  const item = await getExpenseItemById(id);
  const expenseClaimId = item.ExpenseClaimId;

  await item.destroy();

  await recalculateClaimTotal(expenseClaimId, deletedBy);

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

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  createExpenseItem,
  getExpenseItems,
  getExpenseItemById,
  updateExpenseItem,
  deleteExpenseItem
};
