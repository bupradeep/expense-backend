const { Op } = require('sequelize');
const { AuditLog, User } = require('../models');

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

  return AuditLog.findAll({
    where,
    include: [{ model: User }],
    order: [['CreatedAt', 'DESC']]
  });
}

module.exports = {
  getAuditLogs
};
