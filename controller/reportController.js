const express = require('express');
const router = express.Router();

const reportService = require('../services/reportService');

// GET /reports/expenses
router.get('/expenses', async (req, res, next) => {
  try {
    const result = await reportService.getExpenseReport(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
