const { Op } = require('sequelize');
const { ExpenseClaim, User, Department, Project } = require('../models');

async function getExpenseReport(filters) {
  const where = {};

  if (filters.fromDate || filters.toDate) {
    where.ClaimDate = {};
    if (filters.fromDate) where.ClaimDate[Op.gte] = filters.fromDate;
    if (filters.toDate) where.ClaimDate[Op.lte] = filters.toDate;
  }

  if (filters.departmentId) where.DepartmentId = filters.departmentId;
  if (filters.employeeId) where.EmployeeId = filters.employeeId;

  const claims = await ExpenseClaim.findAll({
    where,
    include: [
      { model: User, as: 'Employee', attributes: ['EmployeeCode', 'FullName'] },
      { model: Department, attributes: ['DepartmentName'] },
      { model: Project, attributes: ['ProjectName', 'ClientName', 'CostCenter'], required: false }
    ],
    order: [['ClaimDate', 'DESC']]
  });

  return claims.map((claim) => ({
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
    Currency: claim.Currency,
    Status: claim.Status
  }));
}

module.exports = {
  getExpenseReport
};
