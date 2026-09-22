const express = require('express');
const router = express.Router();

const receiptService = require('../services/expenseReceiptCrudService');

router.post('/', async (req, res, next) => {
  try {
    const result = await receiptService.createReceipt(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /expense-receipts?expenseClaimId=1
router.get('/', async (req, res, next) => {
  try {
    const result = await receiptService.getReceipts(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await receiptService.getReceiptById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await receiptService.updateReceipt(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await receiptService.deleteReceipt(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
