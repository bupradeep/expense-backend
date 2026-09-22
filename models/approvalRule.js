const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const ApprovalRule = sequelize.define('ApprovalRule', {
  ApprovalRuleId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  MinimumAmount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false
  },
  MaximumAmount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true
  },
  ApprovalLevel: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ApproverRole: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  SequenceNo: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  }
}, {
  tableName: 'ApprovalRules',
  freezeTableName: true,
  timestamps: false
});

module.exports = ApprovalRule;
