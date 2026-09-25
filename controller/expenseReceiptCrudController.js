const express = require('express');
const router = express.Router();

const receiptService = require('../services/expenseReceiptCrudService');
const { upload } = require('../utils/receiptStorage');

// multipart/form-data: a "file" part plus expenseClaimId / expenseItemId text fields. The backend
// itself uploads the file into a SharePoint drive via Microsoft Graph (see utils/receiptDriveStorage.js)
// using its own app-only credentials, so any client can attach a receipt with nothing more than this
// bearer-token-authenticated API call -- no SharePoint context or delegated permissions needed.
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'file is required' });
    }

    req.body.createdBy = req.user.userId;
    req.body.uploadedBy = req.user.userId;

    const result = await receiptService.createReceipt(req.body, req.file, req.user);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /expense-receipts/:id/download
router.get('/:id/download', async (req, res, next) => {
  try {
    await receiptService.streamReceiptFile(req.params.id, res, req.user);
  } catch (error) {
    next(error);
  }
});

// GET /expense-receipts?expenseClaimId=1
router.get('/', async (req, res, next) => {
  try {
    const result = await receiptService.getReceipts(req.query, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await receiptService.getReceiptById(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    req.body.updatedBy = req.user.userId;

    const result = await receiptService.updateReceipt(req.params.id, req.body, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await receiptService.deleteReceipt(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
