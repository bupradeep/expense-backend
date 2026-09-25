const { ExpenseReceipt, ExpenseClaim } = require('../models');
const { uploadReceiptToDrive, streamReceiptFromDrive, deleteReceiptFromDrive } = require('../utils/receiptDriveStorage');
const { createError } = require('../utils/httpError');

// Mirrors expenseService.js's assertIsOwnerOrAdmin / assertCanViewClaim -- receipts are a
// sub-resource of a claim, so they're gated by the same ownership (and, for writes, status)
// rules as the claim itself, rather than being independently accessible by anyone authenticated.
const APPROVER_ROLES = ['Manager', 'DepartmentHead', 'Finance'];

async function loadClaimOrThrow(expenseClaimId) {
  const claim = await ExpenseClaim.findByPk(expenseClaimId, { attributes: ['ExpenseClaimId', 'EmployeeId', 'Status'] });

  if (!claim) {
    throw createError(404, 'Expense claim not found');
  }

  return claim;
}

async function assertCanViewClaim(expenseClaimId, actor) {
  if (!actor) return;

  const claim = await loadClaimOrThrow(expenseClaimId);

  if (claim.EmployeeId === actor.userId || actor.role === 'Admin' || APPROVER_ROLES.includes(actor.role)) {
    return;
  }

  throw createError(403, 'You do not have permission to view this expense claim');
}

async function assertCanModifyClaim(expenseClaimId, actor) {
  if (!actor) return;

  const claim = await loadClaimOrThrow(expenseClaimId);

  if (actor.role !== 'Admin') {
    if (claim.EmployeeId !== actor.userId) {
      throw createError(403, 'You can only modify receipts on your own expense claims');
    }

    if (claim.Status !== 'Draft' && claim.Status !== 'Sent Back') {
      throw createError(400, 'Only Draft or Sent Back claims can be modified');
    }
  }
}

async function createReceipt(data, file, actor) {
  if (!data.expenseClaimId) throw createError(400, 'expenseClaimId is required');
  if (!file) throw createError(400, 'file is required');

  await assertCanModifyClaim(data.expenseClaimId, actor);

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

async function getReceipts(filters = {}, actor) {
  if (!filters.expenseClaimId) {
    if (actor && actor.role !== 'Admin') {
      throw createError(400, 'expenseClaimId is required');
    }

    return ExpenseReceipt.findAll({ order: [['ReceiptId', 'ASC']] });
  }

  await assertCanViewClaim(filters.expenseClaimId, actor);

  return ExpenseReceipt.findAll({ where: { ExpenseClaimId: filters.expenseClaimId }, order: [['ReceiptId', 'ASC']] });
}

async function getReceiptById(id, actor) {
  const receipt = await ExpenseReceipt.findByPk(id);

  if (!receipt) {
    throw createError(404, 'Receipt not found');
  }

  await assertCanViewClaim(receipt.ExpenseClaimId, actor);

  return receipt;
}

async function updateReceipt(id, data, actor) {
  const receipt = await getReceiptById(id, actor);

  if (!data.fileName) throw createError(400, 'fileName is required');
  if (!data.filePath) throw createError(400, 'filePath is required');

  await assertCanModifyClaim(receipt.ExpenseClaimId, actor);

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

async function deleteReceipt(id, actor) {
  const receipt = await getReceiptById(id, actor);

  await assertCanModifyClaim(receipt.ExpenseClaimId, actor);

  await receipt.destroy();

  // Best-effort: the DB row is the source of truth, so a file already removed from SharePoint
  // (or a transient Graph error) shouldn't fail the delete.
  deleteReceiptFromDrive(receipt.FilePath).catch(() => {});

  return { message: 'Receipt deleted successfully' };
}

async function streamReceiptFile(id, res, actor) {
  const receipt = await getReceiptById(id, actor);

  await streamReceiptFromDrive(receipt.FilePath, res, receipt.FileName);
}

module.exports = {
  createReceipt,
  getReceipts,
  getReceiptById,
  updateReceipt,
  deleteReceipt,
  streamReceiptFile
};
