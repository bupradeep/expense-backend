const express = require('express');
const router = express.Router();

const approvalService = require('../services/approvalService');

// GET /approvals/pending?userId=2
router.get('/pending', async (req, res, next) => {
  try {
    // Only Admin may look at someone else's queue -- everyone else always sees their own,
    // regardless of what userId they pass in the query string.
    if (req.user.role !== 'Admin') {
      req.query.userId = req.user.userId;
    }

    const result = await approvalService.getPendingApprovals(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /approvals/history?fromDate=&toDate=&status=&approverId=&expenseClaimId=
router.get('/history', async (req, res, next) => {
  try {
    // Non-admins only see history of actions they personally took.
    if (req.user.role !== 'Admin') {
      req.query.approverId = req.user.userId;
    }

    const result = await approvalService.getApprovalHistory(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /approvals/:id/approve
router.post('/:id/approve', async (req, res, next) => {
  try {
    // The approver is always the authenticated caller -- never trust a client-supplied
    // approverId, or any signed-in user could forge another approver's decision.
    req.body.approverId = req.user.userId;

    const result = await approvalService.approveExpense(
      req.params.id,
      req.body
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /approvals/:id/reject
router.post('/:id/reject', async (req, res, next) => {
  try {
    req.body.approverId = req.user.userId;

    const result = await approvalService.rejectExpense(
      req.params.id,
      req.body
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /approvals/:id/send-back
router.post('/:id/send-back', async (req, res, next) => {
  try {
    req.body.approverId = req.user.userId;

    const result = await approvalService.sendBackExpense(
      req.params.id,
      req.body
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
