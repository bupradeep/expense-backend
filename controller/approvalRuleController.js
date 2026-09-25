const express = require('express');
const router = express.Router();

const approvalRuleService = require('../services/approvalRuleService');
const { requireRole } = require('../middleware/requireRole');

router.post('/', requireRole('Admin'), async (req, res, next) => {
  try {
    req.body.createdBy = req.user.userId;

    const result = await approvalRuleService.createApprovalRule(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', requireRole('Admin'), async (req, res, next) => {
  try {
    const result = await approvalRuleService.getApprovalRules(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    const result = await approvalRuleService.getApprovalRuleById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    req.body.updatedBy = req.user.userId;

    const result = await approvalRuleService.updateApprovalRule(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    const result = await approvalRuleService.deleteApprovalRule(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
