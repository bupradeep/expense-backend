const { Op } = require('sequelize');
const { Reimbursement, ExpenseClaim } = require('../models');
const { getPagination, toPagedResult } = require('../utils/pagination');

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

  if (filters.fromDate || filters.toDate) {
    where.PaymentDate = {};
    if (filters.fromDate) where.PaymentDate[Op.gte] = filters.fromDate;
    if (filters.toDate) where.PaymentDate[Op.lte] = filters.toDate;
  }

  const claimWhere = {};
  if (filters.claimNumber) claimWhere.ClaimNumber = { [Op.like]: `%${filters.claimNumber}%` };

  const include = [
    { model: ExpenseClaim, attributes: ['ClaimNumber'], where: claimWhere }
  ];

  const pagination = getPagination(filters);

  if (!pagination) {
    return Reimbursement.findAll({ where, include, order: [['ReimbursementId', 'ASC']] });
  }

  const { count, rows } = await Reimbursement.findAndCountAll({
    where,
    include,
    order: [['ReimbursementId', 'ASC']],
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true
  });

  return toPagedResult(pagination.page, pagination.pageSize, count, rows);
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
