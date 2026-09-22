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
  getExpenseReport
};
