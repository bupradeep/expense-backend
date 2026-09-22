const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const ExpenseItem = sequelize.define('ExpenseItem', {
  ExpenseItemId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ExpenseClaimId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  CategoryId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ExpenseDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  Amount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false
  },
  Currency: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  MerchantName: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  Description: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  BusinessPurpose: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  PaymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  IsPolicyException: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  PolicyExceptionReason: {
    type: DataTypes.STRING(1000),
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
  tableName: 'ExpenseItems',
  freezeTableName: true,
  timestamps: false
});

module.exports = ExpenseItem;
