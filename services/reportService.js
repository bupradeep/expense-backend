const { Op } = require('sequelize');
const { ExpenseClaim, User, Department, Project } = require('../models');
const { getPagination, toPagedResult } = require('../utils/pagination');

function toReportRow(claim) {
  return {
    ExpenseClaimId: claim.ExpenseClaimId,
    ClaimNumber: claim.ClaimNumber,
    ClaimDate: claim.ClaimDate,
    EmployeeCode: claim.Employee.EmployeeCode,
    EmployeeName: claim.Employee.FullName,
    DepartmentName: claim.Department.DepartmentName,
    ProjectName: claim.Project ? claim.Project.ProjectName : null,
    ClientName: claim.Project ? claim.Project.ClientName : null,
    CostCenter: claim.Project ? claim.Project.CostCenter : null,
    TotalAmount: claim.TotalAmount,
    Status: claim.Status
  };
}

const PENDING_STATUSES = [
  'Submitted',
  'Department Head Review',
  'Finance Review'
];

async function getDashboardSummary(filters = {}) {
  const where = {};

  if (filters.fromDate || filters.toDate) {
    where.ClaimDate = {};
    if (filters.fromDate) where.ClaimDate[Op.gte] = filters.fromDate;
    if (filters.toDate) where.ClaimDate[Op.lte] = filters.toDate;
  }

  if (filters.departmentId) where.DepartmentId = filters.departmentId;

  const claims = await ExpenseClaim.findAll({
    where,
    attributes: ['ExpenseClaimId', 'Status', 'TotalAmount', 'ClaimDate'],
    include: [{ model: Department, attributes: ['DepartmentName'] }],
    raw: true,
    nest: true
  });

  const totalClaims = claims.length;
  const totalAmount = claims.reduce((sum, claim) => sum + Number(claim.TotalAmount || 0), 0);

  const statusMap = {};
  const deptMap = {};
  const monthMap = {};

  for (const claim of claims) {
    const amount = Number(claim.TotalAmount || 0);

    if (!statusMap[claim.Status]) statusMap[claim.Status] = { status: claim.Status, count: 0, amount: 0 };
    statusMap[claim.Status].count += 1;
    statusMap[claim.Status].amount += amount;

    const departmentName = claim.Department ? claim.Department.DepartmentName : 'Unassigned';
    if (!deptMap[departmentName]) deptMap[departmentName] = { departmentName, count: 0, amount: 0 };
    deptMap[departmentName].count += 1;
    deptMap[departmentName].amount += amount;

    if (claim.ClaimDate) {
      const month = String(claim.ClaimDate).slice(0, 7);
      if (!monthMap[month]) monthMap[month] = { month, count: 0, amount: 0 };
      monthMap[month].count += 1;
      monthMap[month].amount += amount;
    }
  }

  const pendingApprovalsCount = claims.filter((claim) => PENDING_STATUSES.includes(claim.Status)).length;

  return {
    totalClaims,
    totalAmount,
    pendingApprovalsCount,
    reimbursedAmount: statusMap.Reimbursed ? statusMap.Reimbursed.amount : 0,
    approvedAwaitingPayment: statusMap.Approved ? statusMap.Approved.amount : 0,
    averageClaimAmount: totalClaims ? totalAmount / totalClaims : 0,
    byStatus: Object.values(statusMap).sort((a, b) => b.count - a.count),
    byDepartment: Object.values(deptMap).sort((a, b) => b.amount - a.amount),
    byMonth: Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
  };
}

async function getExpenseReport(filters) {
  const where = {};

  if (filters.fromDate || filters.toDate) {
    where.ClaimDate = {};
    if (filters.fromDate) where.ClaimDate[Op.gte] = filters.fromDate;
    if (filters.toDate) where.ClaimDate[Op.lte] = filters.toDate;
  }

  if (filters.departmentId) where.DepartmentId = filters.departmentId;
  if (filters.employeeId) where.EmployeeId = filters.employeeId;

  const include = [
    { model: User, as: 'Employee', attributes: ['EmployeeCode', 'FullName'] },
    { model: Department, attributes: ['DepartmentName'] },
    { model: Project, attributes: ['ProjectName', 'ClientName', 'CostCenter'], required: false }
  ];

  const pagination = getPagination(filters);

  if (!pagination) {
    const claims = await ExpenseClaim.findAll({ where, include, order: [['ClaimDate', 'DESC']] });
    return claims.map(toReportRow);
  }

  const { count, rows } = await ExpenseClaim.findAndCountAll({
    where,
    include,
    order: [['ClaimDate', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true
  });

  return toPagedResult(pagination.page, pagination.pageSize, count, rows.map(toReportRow));
}

module.exports = {
  getExpenseReport,
  getDashboardSummary
};
