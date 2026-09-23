const { ExpenseClaim, Reimbursement, AuditLog } = require('../models');
const notificationService = require('./notificationService');

async function processPayment(id, data) {
  if (!data.processedBy) {
    throw createError(400, 'processedBy is required');
  }

  const claim = await ExpenseClaim.findByPk(id);

  if (!claim) {
    throw createError(404, 'Expense claim not found');
  }

  if (claim.Status !== 'Approved') {
    throw createError(400, 'Only approved claims can be reimbursed');
  }

  const existing = await Reimbursement.findOne({ where: { ExpenseClaimId: id } });

  if (existing) {
    throw createError(400, 'Reimbursement already exists for this claim');
  }

  const paymentAmount = data.paymentAmount || claim.TotalAmount;

  await Reimbursement.create({
    ExpenseClaimId: id,
    PaymentReference: data.paymentReference || null,
    PaymentDate: data.paymentDate || new Date(),
    PaymentAmount: paymentAmount,
    PaymentMethod: data.paymentMethod || 'Bank Transfer',
    TransactionReference: data.transactionReference || null,
    PaymentRemarks: data.paymentRemarks || null,
    ProcessedBy: data.processedBy,
    Status: 'Completed',
    CreatedAt: new Date(),
    CreatedBy: data.processedBy
  });

  await ExpenseClaim.update({
    Status: 'Reimbursed',
    UpdatedAt: new Date(),
    UpdatedBy: data.processedBy
  }, { where: { ExpenseClaimId: id } });

  await AuditLog.create({
    UserId: data.processedBy,
    ExpenseClaimId: id,
    Action: 'PAYMENT_PROCESSED',
    PreviousStatus: 'Approved',
    NewStatus: 'Reimbursed',
    Comments: 'Reimbursement processed',
    CreatedAt: new Date(),
    CreatedBy: data.processedBy
  });

  await notificationService.notifyReimbursed(id, paymentAmount);

  return {
    message: 'Reimbursement processed successfully',
    status: 'Reimbursed'
  };
}

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  processPayment
};
