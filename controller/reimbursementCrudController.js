const express = require('express');
const router = express.Router();

const reimbursementCrudService = require('../services/reimbursementCrudService');
const { requireRole } = require('../middleware/requireRole');

router.post('/', requireRole('Finance'), async (req, res, next) => {
  try {
    req.body.createdBy = req.user.userId;
    req.body.processedBy = req.user.userId;

    const result = await reimbursementCrudService.createReimbursement(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /reimbursements?expenseClaimId=1
router.get('/', requireRole('Finance'), async (req, res, next) => {
  try {
    const result = await reimbursementCrudService.getReimbursements(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireRole('Finance'), async (req, res, next) => {
  try {
    const result = await reimbursementCrudService.getReimbursementById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireRole('Finance'), async (req, res, next) => {
  try {
    req.body.updatedBy = req.user.userId;
    req.body.processedBy = req.user.userId;

    const result = await reimbursementCrudService.updateReimbursement(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole('Finance'), async (req, res, next) => {
  try {
    const result = await reimbursementCrudService.deleteReimbursement(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
