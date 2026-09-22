const express = require('express');
const router = express.Router();

const reimbursementService = require('../services/reimbursementService');

// POST /expenses/:id/payment
router.post('/:id/payment', async (req, res, next) => {
  try {
    const result = await reimbursementService.processPayment(
      req.params.id,
      req.body
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
