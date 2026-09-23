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
//
// scope controls who may act at a stage:
// - 'personalManager': only the specific person recorded as the claim's employee's
//   ManagerId (Users.ManagerId) -- not just anyone with the Manager role.
// - 'department': anyone with the stage's role in the claim's own department.
// - 'none': anyone with the stage's role, tenant-wide.
const APPROVAL_STAGES = [
  { level: 1, role: 'Manager', status: 'Submitted', scope: 'personalManager' },
  { level: 2, role: 'DepartmentHead', status: 'Department Head Review', scope: 'department' },
  { level: 3, role: 'Finance', status: 'Finance Review', scope: 'none' }
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
  const employeeInclude = { model: User, as: 'Employee', attributes: ['UserId', 'FullName'] };

  if (filters.userId) {
    const approver = await User.findByPk(filters.userId);

    // Admin sees everything pending, unscoped -- same as passing no userId at all.
    if (!approver || approver.Role !== 'Admin') {
      const stage = approver ? STAGE_BY_ROLE[approver.Role] : undefined;

      // No stage maps to this role (e.g. Employee), so nothing is pending for them.
      if (!stage) {
        return pagination ? toPagedResult(pagination.page, pagination.pageSize, 0, []) : [];
      }

      where = { Status: stage.status };

      if (stage.scope === 'department') {
        where.DepartmentId = approver.DepartmentId;
      } else if (stage.scope === 'personalManager') {
        // Only claims whose employee has this approver as their specifically assigned
        // manager -- not just any Manager in the same department.
        employeeInclude.where = { ManagerId: approver.UserId };
        employeeInclude.required = true;
      }
    }
  }

  const include = [
    employeeInclude,
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

async function processApproval(id, data, action, options = {}) {
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

  // The stage (level, required role, department/manager scoping) is derived entirely from
  // the claim's own status/amount/department - never trusted from client input - so the
  // approval level and sequence are resolved automatically rather than passed in.
  const stage = STAGE_BY_STATUS[claim.Status];

  if (!stage) {
    throw createError(400, `Claim is not currently awaiting approval (status: ${claim.Status})`);
  }

  // options.system marks an automatic, non-user-initiated transition (e.g. auto-approving
  // a Manager stage when the employee has no manager mapped) -- it bypasses the role/scope
  // checks below since there's no real approver acting.
  //
  // Otherwise: Admin can act on any claim at any stage; everyone else must match the
  // stage's required role and, where scoped, be the right department or the employee's
  // specifically assigned manager.
  if (!options.system && approver.Role !== 'Admin') {
    if (approver.Role !== stage.role) {
      throw createError(403, `Only a ${stage.role} can act on this claim at its current stage`);
    }

    if (stage.scope === 'department' && approver.DepartmentId !== claim.DepartmentId) {
      throw createError(403, 'You can only act on claims for your own department');
    }

    if (stage.scope === 'personalManager') {
      const employee = await User.findByPk(claim.EmployeeId);

      if (!employee || employee.ManagerId !== approver.UserId) {
        throw createError(403, 'Only the employee\'s assigned manager can act on this claim');
      }
    }
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
        nextStage.scope === 'department' ? claim.DepartmentId : null
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

// Called right after submitExpense puts a claim into the Manager stage. Routes it to the
// employee's specifically assigned manager (Users.ManagerId) if one is set; otherwise there's
// no one who could ever act on this stage, so it auto-advances past it rather than leaving the
// claim stuck forever, recording an ApprovalHistory entry that makes the auto-approval visible.
async function routeInitialApproval(claimId) {
  const claim = await ExpenseClaim.findByPk(claimId);

  if (!claim) return;

  const stage = STAGE_BY_STATUS[claim.Status];

  if (!stage || stage.scope !== 'personalManager') return;

  const employee = await User.findByPk(claim.EmployeeId);

  if (employee && employee.ManagerId) {
    await notificationService.notifyPendingApprovalForManager(claimId, employee.ManagerId);
    return;
  }

  await processApproval(
    claimId,
    {
      approverId: employee ? employee.UserId : claim.EmployeeId,
      comments: 'Auto-approved: no manager is mapped for this employee.'
    },
    'Approved',
    { system: true }
  );
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
  sendBackExpense,
  routeInitialApproval
};
