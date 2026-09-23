const { ApprovalRule } = require('../models');
const { getPagination, toPagedResult } = require('../utils/pagination');
const { createError } = require('../utils/httpError');

const VALID_APPROVER_ROLES = ['Manager', 'DepartmentHead', 'Finance'];

async function createApprovalRule(data) {
  validate(data);

  return ApprovalRule.create({
    MinimumAmount: data.minimumAmount,
    MaximumAmount: data.maximumAmount ?? null,
    ApprovalLevel: data.approvalLevel,
    ApproverRole: data.approverRole,
    IsActive: data.isActive ?? true,
    CreatedAt: new Date(),
    CreatedBy: data.createdBy || null
  });
}

async function getApprovalRules(query = {}) {
  const pagination = getPagination(query);

  if (!pagination) {
    return ApprovalRule.findAll({ order: [['ApprovalRuleId', 'ASC']] });
  }

  const { count, rows } = await ApprovalRule.findAndCountAll({
    order: [['ApprovalRuleId', 'ASC']],
    limit: pagination.limit,
    offset: pagination.offset
  });

  return toPagedResult(pagination.page, pagination.pageSize, count, rows);
}

async function getApprovalRuleById(id) {
  const approvalRule = await ApprovalRule.findByPk(id);

  if (!approvalRule) {
    throw createError(404, 'Approval rule not found');
  }

  return approvalRule;
}

async function updateApprovalRule(id, data) {
  const approvalRule = await getApprovalRuleById(id);
  validate(data);

  await approvalRule.update({
    MinimumAmount: data.minimumAmount,
    MaximumAmount: data.maximumAmount ?? null,
    ApprovalLevel: data.approvalLevel,
    ApproverRole: data.approverRole,
    IsActive: data.isActive ?? true,
    UpdatedAt: new Date(),
    UpdatedBy: data.updatedBy || null
  });

  return approvalRule;
}

async function deleteApprovalRule(id) {
  const approvalRule = await getApprovalRuleById(id);

  await approvalRule.destroy();

  return { message: 'Approval rule deleted successfully' };
}

function validate(data) {
  if (data.minimumAmount === undefined || data.minimumAmount === null) {
    throw createError(400, 'minimumAmount is required');
  }
  if (!data.approvalLevel) throw createError(400, 'approvalLevel is required');
  if (!data.approverRole) throw createError(400, 'approverRole is required');
  if (!VALID_APPROVER_ROLES.includes(data.approverRole)) {
    throw createError(400, `approverRole must be one of: ${VALID_APPROVER_ROLES.join(', ')}`);
  }
}

module.exports = {
  createApprovalRule,
  getApprovalRules,
  getApprovalRuleById,
  updateApprovalRule,
  deleteApprovalRule
};
