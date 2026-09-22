const { Op } = require('sequelize');
const { AuditLog, User, ExpenseClaim } = require('../models');
const { getPagination, toPagedResult } = require('../utils/pagination');

async function getAuditLogs(filters = {}) {
  const where = {};

  if (filters.fromDate || filters.toDate) {
    where.CreatedAt = {};
    if (filters.fromDate) where.CreatedAt[Op.gte] = filters.fromDate;
    if (filters.toDate) where.CreatedAt[Op.lte] = filters.toDate;
  }

  if (filters.userId) where.UserId = filters.userId;
  if (filters.expenseClaimId) where.ExpenseClaimId = filters.expenseClaimId;
  if (filters.status) where.NewStatus = filters.status;
  if (filters.action) where.Action = filters.action;

  const claimWhere = {};
  if (filters.claimNumber) claimWhere.ClaimNumber = { [Op.like]: `%${filters.claimNumber}%` };

  const include = [
    { model: User },
    { model: ExpenseClaim, attributes: ['ClaimNumber'], required: !!filters.claimNumber, where: claimWhere }
  ];

  const pagination = getPagination(filters);

  if (!pagination) {
    return AuditLog.findAll({ where, include, order: [['CreatedAt', 'DESC']] });
  }

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    include,
    order: [['CreatedAt', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true
  });

  return toPagedResult(pagination.page, pagination.pageSize, count, rows);
}

module.exports = {
  getAuditLogs
};
