const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const Reimbursement = sequelize.define('Reimbursement', {
  ReimbursementId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ExpenseClaimId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  PaymentReference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  PaymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  PaymentAmount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false
  },
  PaymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  TransactionReference: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  PaymentRemarks: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  ProcessedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  Status: {
    type: DataTypes.STRING(30),
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
  tableName: 'Reimbursements',
  freezeTableName: true,
  timestamps: false
});

module.exports = Reimbursement;
