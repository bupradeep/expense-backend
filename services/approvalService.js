const { Op } = require('sequelize');
const {
  ExpenseClaim,
  ApprovalHistory,
  ApprovalRule,
  AuditLog,
  User,
  Department
} = require('../models');
const { getPagination, toPagedResult } = require('../utils/pagination');
const notificationService = require('./notificationService');

// Single source of truth for the approval chain. Level 1 (Manager) is always
// required and is entered directly by submitExpense. Levels 2+ only apply if
// an active ApprovalRule exists for the claim's amount at that level, letting
// smaller claims skip straight to 'Approved' after the Manager signs off.
const APPROVAL_STAGES = [
  { level: 1, role: 'Manager', status: 'Submitted', departmentScoped: true },
  { level: 2, role: 'DepartmentHead', status: 'Department Head Review', departmentScoped: true },
  { level: 3, role: 'Finance', status: 'Finance Review', departmentScoped: false }
];

const STAGE_BY_ROLE = Object.fromEntries(APPROVAL_STAGES.map((stage) => [stage.role, stage]));
const STAGE_BY_STATUS = Object.fromEntries(APPROVAL_STAGES.map((stage) => [stage.status, stage]));
const PENDING_STATUSES = APPROVAL_STAGES.map((stage) => stage.status);

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

  const claimWhere = {};
  if (filters.claimNumber) claimWhere.ClaimNumber = { [Op.like]: `%${filters.claimNumber}%` };

  const include = [
    { model: User, as: 'Approver' },
    { model: ExpenseClaim, attributes: ['ClaimNumber'], where: claimWhere }
  ];

  const pagination = getPagination(filters);

  if (!pagination) {
    return ApprovalHistory.findAll({ where, include, order: [['CreatedAt', 'DESC']] });
  }

  const { count, rows } = await ApprovalHistory.findAndCountAll({
    where,
    include,
    order: [['CreatedAt', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true
  });

  return toPagedResult(pagination.page, pagination.pageSize, count, rows);
}

async function enrichWithLastApproval(claims) {
  const result = [];

  for (const claim of claims) {
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

async function getPendingApprovals(filters) {
  const pagination = getPagination(filters);

  let where = { Status: { [Op.in]: PENDING_STATUSES } };

  if (filters.userId) {
    const approver = await User.findByPk(filters.userId);
    const stage = approver ? STAGE_BY_ROLE[approver.Role] : undefined;

    // No stage maps to this role (e.g. Admin/Employee), so nothing is pending for them.
    if (!stage) {
      return pagination ? toPagedResult(pagination.page, pagination.pageSize, 0, []) : [];
    }

    where = { Status: stage.status };
    if (stage.departmentScoped) {
      where.DepartmentId = approver.DepartmentId;
    }
  }

  const include = [
    { model: User, as: 'Employee', attributes: ['UserId', 'FullName'] },
    { model: Department, attributes: ['DepartmentId', 'DepartmentName'] }
  ];

  if (!pagination) {
    const claims = await ExpenseClaim.findAll({
      where,
      include,
      order: [['SubmittedAt', 'ASC']]
    });
    return enrichWithLastApproval(claims);
  }

  const { count, rows } = await ExpenseClaim.findAndCountAll({
    where,
    include,
    order: [['SubmittedAt', 'ASC']],
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true
  });

  const items = await enrichWithLastApproval(rows);
  return toPagedResult(pagination.page, pagination.pageSize, count, items);
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

  const approver = await User.findByPk(data.approverId);

  if (!approver) {
    throw createError(400, 'approverId does not match an existing user');
  }

  // The stage (level, required role, department scoping) is derived entirely from the
  // claim's own status/amount/department - never trusted from client input - so the
  // approval level and sequence are resolved automatically rather than passed in.
  const stage = STAGE_BY_STATUS[claim.Status];

  if (!stage) {
    throw createError(400, `Claim is not currently awaiting approval (status: ${claim.Status})`);
  }

  if (approver.Role !== stage.role) {
    throw createError(403, `Only a ${stage.role} can act on this claim at its current stage`);
  }

  if (stage.departmentScoped && approver.DepartmentId !== claim.DepartmentId) {
    throw createError(403, 'You can only act on claims for your own department');
  }

  const approvalLevel = stage.level;

  let newStatus = action;
  let nextStage = null;

  if (action === 'Approved') {
    const nextRole = await getNextStageRole(claim.TotalAmount, approvalLevel);

    if (nextRole) {
      nextStage = STAGE_BY_ROLE[nextRole];

      if (!nextStage) {
        throw createError(500, `Approval rule configured with unknown role "${nextRole}"`);
      }
    }

    newStatus = nextStage ? nextStage.status : 'Approved';
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

  if (action === 'Approved') {
    await notificationService.notifyApproved(id, data.comments);

    if (nextStage) {
      await notificationService.notifyPendingApproval(
        id,
        nextStage.role,
        nextStage.departmentScoped ? claim.DepartmentId : null
      );
    }
  } else if (action === 'Rejected') {
    await notificationService.notifyRejected(id, data.comments);
  } else if (action === 'Sent Back') {
    await notificationService.notifySentBack(id, data.comments);
  }

  return {
    message: `Claim ${action.toLowerCase()} successfully`,
    status: newStatus
  };
}

async function getNextStageRole(amount, currentLevel) {
  const rule = await ApprovalRule.findOne({
    where: {
      IsActive: true,
      MinimumAmount: { [Op.lte]: amount },
      [Op.or]: [
        { MaximumAmount: { [Op.gte]: amount } },
        { MaximumAmount: null }
      ],
      ApprovalLevel: currentLevel + 1
    },
    order: [['ApprovalRuleId', 'ASC']]
  });

  return rule ? rule.ApproverRole : null;
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
