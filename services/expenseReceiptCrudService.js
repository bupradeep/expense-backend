const { ExpenseReceipt } = require('../models');

async function createReceipt(data) {
  if (!data.expenseClaimId) throw createError(400, 'expenseClaimId is required');
  if (!data.fileName) throw createError(400, 'fileName is required');
  if (!data.filePath) throw createError(400, 'filePath is required');

  const receipt = await ExpenseReceipt.create({
    ExpenseClaimId: data.expenseClaimId,
    ExpenseItemId: data.expenseItemId || null,
    FileName: data.fileName,
    FilePath: data.filePath,
    FileType: data.fileType || null,
    FileSize: data.fileSize || null,
    UploadedBy: data.uploadedBy || null,
    UploadedAt: new Date(),
    CreatedAt: new Date(),
    CreatedBy: data.createdBy || data.uploadedBy || null
  });

  return receipt;
}

async function getReceipts(filters = {}) {
  const where = {};
  if (filters.expenseClaimId) where.ExpenseClaimId = filters.expenseClaimId;

  return ExpenseReceipt.findAll({ where, order: [['ReceiptId', 'ASC']] });
}

async function getReceiptById(id) {
  const receipt = await ExpenseReceipt.findByPk(id);

  if (!receipt) {
    throw createError(404, 'Receipt not found');
  }

  return receipt;
}

async function updateReceipt(id, data) {
  const receipt = await getReceiptById(id);

  if (!data.fileName) throw createError(400, 'fileName is required');
  if (!data.filePath) throw createError(400, 'filePath is required');

  await receipt.update({
    ExpenseItemId: data.expenseItemId || null,
    FileName: data.fileName,
    FilePath: data.filePath,
    FileType: data.fileType || null,
    FileSize: data.fileSize || null,
    UpdatedAt: new Date(),
    UpdatedBy: data.updatedBy || null
  });

  return receipt;
}

async function deleteReceipt(id) {
  const receipt = await getReceiptById(id);

  await receipt.destroy();

  return { message: 'Receipt deleted successfully' };
}

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  createReceipt,
  getReceipts,
  getReceiptById,
  updateReceipt,
  deleteReceipt
};
