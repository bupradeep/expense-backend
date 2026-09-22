const express = require('express');
const router = express.Router();

const reimbursementCrudService = require('../services/reimbursementCrudService');

router.post('/', async (req, res, next) => {
  try {
    const result = await reimbursementCrudService.createReimbursement(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /reimbursements?expenseClaimId=1
router.get('/', async (req, res, next) => {
  try {
    const result = await reimbursementCrudService.getReimbursements(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await reimbursementCrudService.getReimbursementById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await reimbursementCrudService.updateReimbursement(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await reimbursementCrudService.deleteReimbursement(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
