const sequelize = require('../utils/sequelize');
const User = require('./user');
const Department = require('./department');
const Project = require('./project');
const ExpenseCategory = require('./expenseCategory');
const PolicyRule = require('./policyRule');
const ApprovalRule = require('./approvalRule');
const ExpenseClaim = require('./expenseClaim');
const ExpenseItem = require('./expenseItem');
const ExpenseReceipt = require('./expenseReceipt');
const ApprovalHistory = require('./approvalHistory');
const AuditLog = require('./auditLog');
const Reimbursement = require('./reimbursement');

ExpenseClaim.belongsTo(User, { foreignKey: 'EmployeeId', as: 'Employee' });
ExpenseClaim.belongsTo(Department, { foreignKey: 'DepartmentId' });
ExpenseClaim.belongsTo(Project, { foreignKey: 'ProjectId' });
ExpenseClaim.hasMany(ExpenseItem, { foreignKey: 'ExpenseClaimId', as: 'Items' });
ExpenseClaim.hasMany(ExpenseReceipt, { foreignKey: 'ExpenseClaimId', as: 'Receipts' });
ExpenseClaim.hasMany(ApprovalHistory, { foreignKey: 'ExpenseClaimId' });
ExpenseClaim.hasMany(AuditLog, { foreignKey: 'ExpenseClaimId' });
ExpenseClaim.hasOne(Reimbursement, { foreignKey: 'ExpenseClaimId' });

ExpenseItem.belongsTo(ExpenseClaim, { foreignKey: 'ExpenseClaimId' });
ExpenseItem.belongsTo(ExpenseCategory, { foreignKey: 'CategoryId' });

ExpenseReceipt.belongsTo(ExpenseClaim, { foreignKey: 'ExpenseClaimId' });
ExpenseReceipt.belongsTo(ExpenseItem, { foreignKey: 'ExpenseItemId' });

PolicyRule.belongsTo(ExpenseCategory, { foreignKey: 'CategoryId' });
ExpenseCategory.hasMany(PolicyRule, { foreignKey: 'CategoryId' });

ApprovalHistory.belongsTo(ExpenseClaim, { foreignKey: 'ExpenseClaimId' });
ApprovalHistory.belongsTo(User, { foreignKey: 'ApproverId', as: 'Approver' });

AuditLog.belongsTo(ExpenseClaim, { foreignKey: 'ExpenseClaimId' });
AuditLog.belongsTo(User, { foreignKey: 'UserId' });

Reimbursement.belongsTo(ExpenseClaim, { foreignKey: 'ExpenseClaimId' });

module.exports = {
  sequelize,
  User,
  Department,
  Project,
  ExpenseCategory,
  PolicyRule,
  ApprovalRule,
  ExpenseClaim,
  ExpenseItem,
  ExpenseReceipt,
  ApprovalHistory,
  AuditLog,
  Reimbursement
};
