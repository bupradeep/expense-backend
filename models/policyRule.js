const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const PolicyRule = sequelize.define('PolicyRule', {
  PolicyRuleId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  CategoryId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  PolicyName: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  MaximumAmount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false
  },
  LimitType: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  IsReceiptRequired: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
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
  tableName: 'PolicyRules',
  freezeTableName: true,
  timestamps: false
});

module.exports = PolicyRule;
