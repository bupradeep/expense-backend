const express = require('express');
const router = express.Router();

const approvalRuleService = require('../services/approvalRuleService');

router.post('/', async (req, res, next) => {
  try {
    const result = await approvalRuleService.createApprovalRule(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await approvalRuleService.getApprovalRules();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await approvalRuleService.getApprovalRuleById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await approvalRuleService.updateApprovalRule(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await approvalRuleService.deleteApprovalRule(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
