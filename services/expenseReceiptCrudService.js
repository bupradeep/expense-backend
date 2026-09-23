const { ExpenseReceipt } = require('../models');
const { uploadReceiptToDrive, streamReceiptFromDrive, deleteReceiptFromDrive } = require('../utils/receiptDriveStorage');

async function createReceipt(data, file) {
  if (!data.expenseClaimId) throw createError(400, 'expenseClaimId is required');
  if (!file) throw createError(400, 'file is required');

  // The SharePoint drive item id is the stable, backend-opaque handle stored in FilePath --
  // clients never see or use it directly; they only ever go through GET .../download.
  const driveItemId = await uploadReceiptToDrive(data.expenseClaimId, file);

  const receipt = await ExpenseReceipt.create({
    ExpenseClaimId: data.expenseClaimId,
    ExpenseItemId: data.expenseItemId || null,
    FileName: file.originalname,
    FilePath: driveItemId,
    FileType: file.mimetype || null,
    FileSize: file.size || null,
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

  // Best-effort: the DB row is the source of truth, so a file already removed from SharePoint
  // (or a transient Graph error) shouldn't fail the delete.
  deleteReceiptFromDrive(receipt.FilePath).catch(() => {});

  return { message: 'Receipt deleted successfully' };
}

async function streamReceiptFile(id, res) {
  const receipt = await getReceiptById(id);

  await streamReceiptFromDrive(receipt.FilePath, res, receipt.FileName);
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
  deleteReceipt,
  streamReceiptFile
};
