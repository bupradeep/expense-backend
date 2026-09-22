const express = require('express');
const router = express.Router();

const reimbursementService = require('../services/reimbursementService');

// POST /expenses/:id/payment
router.post('/:id/payment', async (req, res, next) => {
  try {
    // Who processed the payment is always the authenticated caller -- never trust a
    // client-supplied processedBy.
    req.body.processedBy = req.user.userId;

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
