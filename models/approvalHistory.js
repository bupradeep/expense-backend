const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const ApprovalHistory = sequelize.define('ApprovalHistory', {
  ApprovalHistoryId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ExpenseClaimId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ApprovalLevel: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ApproverId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  Action: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  Comments: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  ActionDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  PreviousStatus: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  NewStatus: {
    type: DataTypes.STRING(50),
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
  tableName: 'ApprovalHistory',
  freezeTableName: true,
  timestamps: false
});

module.exports = ApprovalHistory;
