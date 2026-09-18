const db = require('../utils/db');
const queries = require('../utils/expenseQueries');

async function processPayment(id, data) {
  if (!data.processedBy) {
    throw createError(400, 'processedBy is required');
  }

  const pool = await db.getPool();

  const claimResult = await new db.sql.Request(pool)
    .input('ExpenseClaimId', db.sql.Int, id)
    .query(queries.getClaimById);

  if (!claimResult.recordset.length) {
    throw createError(404, 'Expense claim not found');
  }

  const claim = claimResult.recordset[0];

  if (claim.Status !== 'Approved') {
    throw createError(400, 'Only approved claims can be reimbursed');
  }

  const existing = await new db.sql.Request(pool)
    .input('ExpenseClaimId', db.sql.Int, id)
    .query(queries.getReimbursementByClaimId);

  if (existing.recordset.length) {
    throw createError(400, 'Reimbursement already exists for this claim');
  }

  await new db.sql.Request(pool)
    .input('ExpenseClaimId', db.sql.Int, id)
    .input('PaymentReference', db.sql.VarChar(100), data.paymentReference || null)
    .input('PaymentDate', db.sql.Date, data.paymentDate || new Date())
    .input('PaymentAmount', db.sql.Decimal(18, 2), data.paymentAmount || claim.TotalAmount)
    .input('PaymentMethod', db.sql.VarChar(50), data.paymentMethod || 'Bank Transfer')
    .input('TransactionReference', db.sql.VarChar(150), data.transactionReference || null)
    .input('PaymentRemarks', db.sql.VarChar(1000), data.paymentRemarks || null)
    .input('ProcessedBy', db.sql.Int, data.processedBy)
    .input('Status', db.sql.VarChar(30), 'Completed')
    .input('CreatedBy', db.sql.Int, data.processedBy)
    .query(queries.insertReimbursement);

  await new db.sql.Request(pool)
    .input('ExpenseClaimId', db.sql.Int, id)
    .input('Status', db.sql.VarChar(50), 'Reimbursed')
    .input('UpdatedBy', db.sql.Int, data.processedBy)
    .query(queries.updateClaimStatus);

  await new db.sql.Request(pool)
    .input('UserId', db.sql.Int, data.processedBy)
    .input('ExpenseClaimId', db.sql.Int, id)
    .input('Action', db.sql.VarChar(100), 'PAYMENT_PROCESSED')
    .input('PreviousStatus', db.sql.VarChar(50), 'Approved')
    .input('NewStatus', db.sql.VarChar(50), 'Reimbursed')
    .input('Comments', db.sql.VarChar(1000), 'Reimbursement processed')
    .query(queries.insertAuditLog);

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
