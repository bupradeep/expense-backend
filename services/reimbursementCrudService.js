const { Reimbursement } = require('../models');

async function createReimbursement(data) {
  if (!data.expenseClaimId) throw createError(400, 'expenseClaimId is required');
  if (!data.paymentAmount) throw createError(400, 'paymentAmount is required');

  const reimbursement = await Reimbursement.create({
    ExpenseClaimId: data.expenseClaimId,
    PaymentReference: data.paymentReference || null,
    PaymentDate: data.paymentDate || new Date(),
    PaymentAmount: data.paymentAmount,
    PaymentMethod: data.paymentMethod || null,
    TransactionReference: data.transactionReference || null,
    PaymentRemarks: data.paymentRemarks || null,
    ProcessedBy: data.processedBy || null,
    Status: data.status || 'Pending',
    CreatedAt: new Date(),
    CreatedBy: data.createdBy || data.processedBy || null
  });

  return reimbursement;
}

async function getReimbursements(filters = {}) {
  const where = {};
  if (filters.expenseClaimId) where.ExpenseClaimId = filters.expenseClaimId;

  return Reimbursement.findAll({ where, order: [['ReimbursementId', 'ASC']] });
}

async function getReimbursementById(id) {
  const reimbursement = await Reimbursement.findByPk(id);

  if (!reimbursement) {
    throw createError(404, 'Reimbursement not found');
  }

  return reimbursement;
}

async function updateReimbursement(id, data) {
  const reimbursement = await getReimbursementById(id);

  if (!data.paymentAmount) throw createError(400, 'paymentAmount is required');

  await reimbursement.update({
    PaymentReference: data.paymentReference || null,
    PaymentDate: data.paymentDate || new Date(),
    PaymentAmount: data.paymentAmount,
    PaymentMethod: data.paymentMethod || null,
    TransactionReference: data.transactionReference || null,
    PaymentRemarks: data.paymentRemarks || null,
    ProcessedBy: data.processedBy || null,
    Status: data.status || 'Pending',
    UpdatedAt: new Date(),
    UpdatedBy: data.updatedBy || null
  });

  return reimbursement;
}

async function deleteReimbursement(id) {
  const reimbursement = await getReimbursementById(id);

  await reimbursement.destroy();

  return { message: 'Reimbursement deleted successfully' };
}

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  createReimbursement,
  getReimbursements,
  getReimbursementById,
  updateReimbursement,
  deleteReimbursement
};
