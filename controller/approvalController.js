const express = require('express');
const router = express.Router();

const approvalService = require('../services/approvalService');

// GET /approvals/pending?userId=2
router.get('/pending', async (req, res, next) => {
  try {
    const result = await approvalService.getPendingApprovals(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /approvals/:id/approve
router.post('/:id/approve', async (req, res, next) => {
  try {
    const result = await approvalService.approveExpense(
      req.params.id,
      req.body
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /approvals/:id/reject
router.post('/:id/reject', async (req, res, next) => {
  try {
    const result = await approvalService.rejectExpense(
      req.params.id,
      req.body
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /approvals/:id/send-back
router.post('/:id/send-back', async (req, res, next) => {
  try {
    const result = await approvalService.sendBackExpense(
      req.params.id,
      req.body
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
