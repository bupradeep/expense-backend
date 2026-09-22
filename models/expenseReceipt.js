const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const ExpenseReceipt = sequelize.define('ExpenseReceipt', {
  ReceiptId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ExpenseClaimId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ExpenseItemId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  FileName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  FilePath: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  FileType: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  FileSize: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  UploadedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  UploadedAt: {
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
  tableName: 'ExpenseReceipts',
  freezeTableName: true,
  timestamps: false
});

module.exports = ExpenseReceipt;
