const express = require('express');
const router = express.Router();

const policyRuleService = require('../services/policyRuleService');

router.post('/', async (req, res, next) => {
  try {
    const result = await policyRuleService.createPolicyRule(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await policyRuleService.getPolicyRules();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await policyRuleService.getPolicyRuleById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await policyRuleService.updatePolicyRule(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await policyRuleService.deletePolicyRule(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
