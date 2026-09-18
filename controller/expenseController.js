const express = require('express');
const router = express.Router();

const expenseService = require('../services/expenseService');

// POST /expenses
router.post('/', async (req, res, next) => {
  try {
    const result = await expenseService.createExpense(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /expenses
router.get('/', async (req, res, next) => {
  try {
    const result = await expenseService.getExpenses(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /expenses/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await expenseService.getExpenseById(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// PUT /expenses/:id
router.put('/:id', async (req, res, next) => {
  try {
    const result = await expenseService.updateExpense(
      req.params.id,
      req.body
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// DELETE /expenses/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await expenseService.deleteExpense(
      req.params.id,
      req.body
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /expenses/:id/submit
router.post('/:id/submit', async (req, res, next) => {
  try {
    const result = await expenseService.submitExpense(
      req.params.id,
      req.body
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /expenses/:id/history
router.get('/:id/history', async (req, res, next) => {
  try {
    const result = await expenseService.getExpenseHistory(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /expenses/:id/receipts
router.get('/:id/receipts', async (req, res, next) => {
  try {
    const result = await expenseService.getReceipts(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
