const { ApprovalRule } = require('../models');

async function createApprovalRule(data) {
  validate(data);

  return ApprovalRule.create({
    MinimumAmount: data.minimumAmount,
    MaximumAmount: data.maximumAmount ?? null,
    ApprovalLevel: data.approvalLevel,
    ApproverRole: data.approverRole,
    SequenceNo: data.sequenceNo,
    IsActive: data.isActive ?? true
  });
}

async function getApprovalRules() {
  return ApprovalRule.findAll({ order: [['ApprovalRuleId', 'ASC']] });
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
    SequenceNo: data.sequenceNo,
    IsActive: data.isActive ?? true
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
  if (!data.sequenceNo) throw createError(400, 'sequenceNo is required');
}

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  createApprovalRule,
  getApprovalRules,
  getApprovalRuleById,
  updateApprovalRule,
  deleteApprovalRule
};
