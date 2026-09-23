const { PolicyRule } = require('../models');
const { createError } = require('../utils/httpError');

async function createPolicyRule(data) {
  validate(data);

  return PolicyRule.create({
    CategoryId: data.categoryId,
    PolicyName: data.policyName,
    MaximumAmount: data.maximumAmount,
    LimitType: data.limitType,
    IsReceiptRequired: data.isReceiptRequired ?? true,
    IsActive: data.isActive ?? true,
    CreatedAt: new Date(),
    CreatedBy: data.createdBy || null
  });
}

async function getPolicyRules() {
  return PolicyRule.findAll({ order: [['PolicyRuleId', 'ASC']] });
}

async function getPolicyRuleById(id) {
  const policyRule = await PolicyRule.findByPk(id);

  if (!policyRule) {
    throw createError(404, 'Policy rule not found');
  }

  return policyRule;
}

async function updatePolicyRule(id, data) {
  const policyRule = await getPolicyRuleById(id);
  validate(data);

  await policyRule.update({
    CategoryId: data.categoryId,
    PolicyName: data.policyName,
    MaximumAmount: data.maximumAmount,
    LimitType: data.limitType,
    IsReceiptRequired: data.isReceiptRequired ?? true,
    IsActive: data.isActive ?? true,
    UpdatedAt: new Date(),
    UpdatedBy: data.updatedBy || null
  });

  return policyRule;
}

async function deletePolicyRule(id) {
  const policyRule = await getPolicyRuleById(id);

  await policyRule.destroy();

  return { message: 'Policy rule deleted successfully' };
}

function validate(data) {
  if (!data.categoryId) throw createError(400, 'categoryId is required');
  if (!data.policyName) throw createError(400, 'policyName is required');
  if (data.maximumAmount === undefined || data.maximumAmount === null) {
    throw createError(400, 'maximumAmount is required');
  }
  if (!data.limitType) throw createError(400, 'limitType is required');
}

module.exports = {
  createPolicyRule,
  getPolicyRules,
  getPolicyRuleById,
  updatePolicyRule,
  deletePolicyRule
};
