const express = require('express');
const router = express.Router();

const reportService = require('../services/reportService');
const { requireRole } = require('../middleware/requireRole');

// GET /reports/expenses
// Finance also has a Reports tab (reusing this same admin screen) in the SPFx app.
router.get('/expenses', requireRole('Admin', 'Finance'), async (req, res, next) => {
  try {
    const result = await reportService.getExpenseReport(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /reports/dashboard
router.get('/dashboard', requireRole('Admin'), async (req, res, next) => {
  try {
    const result = await reportService.getDashboardSummary(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
