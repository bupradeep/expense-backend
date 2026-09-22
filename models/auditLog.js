const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const AuditLog = sequelize.define('AuditLog', {
  AuditLogId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  UserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ExpenseClaimId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  Action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  PreviousStatus: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  NewStatus: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  Comments: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  CreatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  CreatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'AuditLogs',
  freezeTableName: true,
  timestamps: false
});

module.exports = AuditLog;
