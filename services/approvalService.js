const { Op } = require('sequelize');
const {
  ExpenseClaim,
  ApprovalHistory,
  ApprovalRule,
  AuditLog,
  User,
  Department
} = require('../models');

const STATUS_ROLE_MAP = {
  Submitted: 'Manager',
  'Department Head Review': 'DepartmentHead',
  'Finance Review': 'Finance',
  'Finance Head Review': 'FinanceHead'
};

async function getApprovalHistory(filters = {}) {
  const where = {};

  if (filters.fromDate || filters.toDate) {
    where.CreatedAt = {};
    if (filters.fromDate) where.CreatedAt[Op.gte] = filters.fromDate;
    if (filters.toDate) where.CreatedAt[Op.lte] = filters.toDate;
  }

  if (filters.status) where.NewStatus = filters.status;
  if (filters.approverId) where.ApproverId = filters.approverId;
  if (filters.expenseClaimId) where.ExpenseClaimId = filters.expenseClaimId;

  return ApprovalHistory.findAll({
    where,
    include: [{ model: User, as: 'Approver' }],
    order: [['CreatedAt', 'DESC']]
  });
}

async function getPendingApprovals(filters) {
  const statuses = [
    'Submitted',
    'Manager Approved',
    'Department Head Review',
    'Finance Review',
    'Finance Head Review'
  ];

  let approverRole = null;

  if (filters.userId) {
    const approver = await User.findByPk(filters.userId);
    approverRole = approver ? approver.Role : null;
  }

  const claims = await ExpenseClaim.findAll({
    where: { Status: { [Op.in]: statuses } },
    include: [
      { model: User, as: 'Employee', attributes: ['UserId', 'FullName'] },
      { model: Department, attributes: ['DepartmentId', 'DepartmentName'] }
    ],
    order: [['SubmittedAt', 'ASC']]
  });

  const filtered = filters.userId
    ? claims.filter((claim) => STATUS_ROLE_MAP[claim.Status] === approverRole)
    : claims;

  const result = [];

  for (const claim of filtered) {
    const lastApproval = await ApprovalHistory.findOne({
      where: { ExpenseClaimId: claim.ExpenseClaimId },
      order: [['ApprovalHistoryId', 'DESC']]
    });

    result.push({
      ExpenseClaimId: claim.ExpenseClaimId,
      ClaimNumber: claim.ClaimNumber,
      EmployeeId: claim.EmployeeId,
      EmployeeName: claim.Employee.FullName,
      DepartmentId: claim.DepartmentId,
      DepartmentName: claim.Department.DepartmentName,
      TotalAmount: claim.TotalAmount,
      BusinessPurpose: claim.BusinessPurpose,
      Status: claim.Status,
      SubmittedAt: claim.SubmittedAt,
      ApprovalLevel: lastApproval ? lastApproval.ApprovalLevel : null,
      LastApprovalDate: lastApproval ? lastApproval.ActionDate : null
    });
  }

  return result;
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

  const claim = await ExpenseClaim.findByPk(id);

  if (!claim) {
    throw createError(404, 'Expense claim not found');
  }

  const approvalLevel = data.approvalLevel || 1;

  let newStatus = action;

  if (action === 'Approved') {
    const next = await getNextApprovalLevel(claim.TotalAmount, approvalLevel);

    newStatus = next ? getStatusForRole(next.ApproverRole) : 'Approved';
  }

  await ApprovalHistory.create({
    ExpenseClaimId: id,
    ApprovalLevel: approvalLevel,
    ApproverId: data.approverId,
    Action: action,
    Comments: data.comments || null,
    ActionDate: new Date(),
    PreviousStatus: claim.Status,
    NewStatus: newStatus,
    CreatedAt: new Date(),
    CreatedBy: data.approverId
  });

  await ExpenseClaim.update({
    Status: newStatus,
    UpdatedAt: new Date(),
    UpdatedBy: data.approverId
  }, { where: { ExpenseClaimId: id } });

  await AuditLog.create({
    UserId: data.approverId,
    ExpenseClaimId: id,
    Action: `CLAIM_${action.toUpperCase().replace(' ', '_')}`,
    PreviousStatus: claim.Status,
    NewStatus: newStatus,
    Comments: data.comments || null,
    CreatedAt: new Date(),
    CreatedBy: data.approverId
  });

  return {
    message: `Claim ${action.toLowerCase()} successfully`,
    status: newStatus
  };
}

async function getNextApprovalLevel(amount, currentLevel) {
  return ApprovalRule.findOne({
    where: {
      IsActive: true,
      MinimumAmount: { [Op.lte]: amount },
      [Op.or]: [
        { MaximumAmount: { [Op.gte]: amount } },
        { MaximumAmount: null }
      ],
      SequenceNo: currentLevel + 1
    },
    order: [['ApprovalRuleId', 'ASC']]
  });
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
  getApprovalHistory,
  getPendingApprovals,
  approveExpense,
  rejectExpense,
  sendBackExpense
};
