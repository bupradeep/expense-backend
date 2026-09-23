const express = require('express');
const router = express.Router();

const expenseItemService = require('../services/expenseItemCrudService');

router.post('/', async (req, res, next) => {
  try {
    req.body.createdBy = req.user.userId;

    const result = await expenseItemService.createExpenseItem(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /expense-items?expenseClaimId=1
router.get('/', async (req, res, next) => {
  try {
    const result = await expenseItemService.getExpenseItems(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await expenseItemService.getExpenseItemById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    req.body.updatedBy = req.user.userId;

    const result = await expenseItemService.updateExpenseItem(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await expenseItemService.deleteExpenseItem(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
