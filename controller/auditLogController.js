const express = require('express');
const router = express.Router();

const auditLogService = require('../services/auditLogService');

// GET /audit-logs?fromDate=&toDate=&userId=&expenseClaimId=&status=
router.get('/', async (req, res, next) => {
  try {
    const result = await auditLogService.getAuditLogs(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
