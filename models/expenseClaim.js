const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const ExpenseClaim = sequelize.define('ExpenseClaim', {
  ExpenseClaimId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ClaimNumber: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  EmployeeId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  DepartmentId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ProjectId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  ClaimDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  TotalAmount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0
  },
  BusinessPurpose: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  Location: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  PaymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  Remarks: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  Status: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  SubmittedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  CreatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  UpdatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  CreatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  UpdatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'ExpenseClaims',
  freezeTableName: true,
  timestamps: false
});

module.exports = ExpenseClaim;
