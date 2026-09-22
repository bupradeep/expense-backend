const express = require('express');
const router = express.Router();

const expenseService = require('../services/expenseService');

// POST /expenses
router.post('/', async (req, res, next) => {
  try {
    // The claim's owner/creator is always the authenticated caller -- never trust a
    // client-supplied employeeId/createdBy, or any signed-in user could file a claim
    // "as" someone else.
    req.body.employeeId = req.user.userId;
    req.body.createdBy = req.user.userId;

    const result = await expenseService.createExpense(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /expenses
router.get('/', async (req, res, next) => {
  try {
    const result = await expenseService.getExpenses(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /expenses/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await expenseService.getExpenseById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// PUT /expenses/:id
router.put('/:id', async (req, res, next) => {
  try {
    req.body.updatedBy = req.user.userId;

    const result = await expenseService.updateExpense(
      req.params.id,
      req.body,
      req.user
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// DELETE /expenses/:id
router.delete('/:id', async (req, res, next) => {
  try {
    req.body.updatedBy = req.user.userId;

    const result = await expenseService.deleteExpense(
      req.params.id,
      req.body,
      req.user
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /expenses/:id/submit
router.post('/:id/submit', async (req, res, next) => {
  try {
    req.body.userId = req.user.userId;

    const result = await expenseService.submitExpense(
      req.params.id,
      req.body,
      req.user
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /expenses/:id/history
router.get('/:id/history', async (req, res, next) => {
  try {
    const result = await expenseService.getExpenseHistory(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /expenses/:id/receipts
router.get('/:id/receipts', async (req, res, next) => {
  try {
    const result = await expenseService.getReceipts(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /expenses/:id/comments
router.get('/:id/comments', async (req, res, next) => {
  try {
    const result = await expenseService.getComments(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /expenses/:id/comments
router.post('/:id/comments', async (req, res, next) => {
  try {
    // Who's commenting is always the authenticated caller -- never trust a client-supplied
    // userId, or the comment-privilege check in addComment could be spoofed.
    req.body.userId = req.user.userId;

    const result = await expenseService.addComment(req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
