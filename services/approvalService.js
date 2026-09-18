const db = require('../utils/db');
const queries = require('../utils/expenseQueries');

async function getPendingApprovals(filters) {
  const pool = await db.getPool();

  const result = await new db.sql.Request(pool)
    .input('UserId', db.sql.Int, filters.userId || null)
    .query(queries.getPendingApprovals);

  return result.recordset;
}

async function approveExpense(id, data) {
  return processApproval(id, data, 'Approved');
}

async function rejectExpense(id, data) {
  if (!data.comments) {
    throw createError(400, 'Comments are mandatory when rejecting a claim');
  }

  return processApproval(id, data, 'Rejected');
}

async function sendBackExpense(id, data) {
  if (!data.comments) {
    throw createError(400, 'Comments are mandatory when sending back a claim');
  }

  return processApproval(id, data, 'Sent Back');
}

async function processApproval(id, data, action) {
  if (!data.approverId) {
    throw createError(400, 'approverId is required');
  }

  const pool = await db.getPool();

  const claimResult = await new db.sql.Request(pool)
    .input('ExpenseClaimId', db.sql.Int, id)
    .query(queries.getClaimById);

  if (!claimResult.recordset.length) {
    throw createError(404, 'Expense claim not found');
  }

  const claim = claimResult.recordset[0];

  const approvalLevel = data.approvalLevel || 1;

  let newStatus = action;

  if (action === 'Approved') {
    const next = await getNextApprovalLevel(claim.TotalAmount, approvalLevel);

    if (next) {
      newStatus = getStatusForRole(next.ApproverRole);
    } else {
      newStatus = 'Approved';
    }
  }

  await new db.sql.Request(pool)
    .input('ExpenseClaimId', db.sql.Int, id)
    .input('ApprovalLevel', db.sql.Int, approvalLevel)
    .input('ApproverId', db.sql.Int, data.approverId)
    .input('Action', db.sql.VarChar(30), action)
    .input('Comments', db.sql.VarChar(1000), data.comments || null)
    .input('PreviousStatus', db.sql.VarChar(50), claim.Status)
    .input('NewStatus', db.sql.VarChar(50), newStatus)
    .input('CreatedBy', db.sql.Int, data.approverId)
    .query(queries.insertApprovalHistory);

  await new db.sql.Request(pool)
    .input('ExpenseClaimId', db.sql.Int, id)
    .input('Status', db.sql.VarChar(50), newStatus)
    .input('UpdatedBy', db.sql.Int, data.approverId)
    .query(queries.updateClaimStatus);

  await new db.sql.Request(pool)
    .input('UserId', db.sql.Int, data.approverId)
    .input('ExpenseClaimId', db.sql.Int, id)
    .input('Action', db.sql.VarChar(100), `CLAIM_${action.toUpperCase().replace(' ', '_')}`)
    .input('PreviousStatus', db.sql.VarChar(50), claim.Status)
    .input('NewStatus', db.sql.VarChar(50), newStatus)
    .input('Comments', db.sql.VarChar(1000), data.comments || null)
    .query(queries.insertAuditLog);

  return {
    message: `Claim ${action.toLowerCase()} successfully`,
    status: newStatus
  };
}

async function getNextApprovalLevel(amount, currentLevel) {
  const pool = await db.getPool();

  const result = await new db.sql.Request(pool)
    .input('Amount', db.sql.Decimal(18, 2), amount)
    .input('SequenceNo', db.sql.Int, currentLevel + 1)
    .query(queries.getNextApprovalRule);

  return result.recordset[0] || null;
}

function getStatusForRole(role) {
  switch (role) {
    case 'DepartmentHead':
      return 'Department Head Review';
    case 'Finance':
      return 'Finance Review';
    case 'FinanceHead':
      return 'Finance Head Review';
    default:
      return 'Pending Approval';
  }
}

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  getPendingApprovals,
  approveExpense,
  rejectExpense,
  sendBackExpense
};
