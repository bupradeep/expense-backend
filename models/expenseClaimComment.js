const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const ExpenseClaimComment = sequelize.define('ExpenseClaimComment', {
  ExpenseClaimCommentId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ExpenseClaimId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  UserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  CommentText: {
    type: DataTypes.STRING(1000),
    allowNull: false
  },
  CreatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'ExpenseClaimComments',
  freezeTableName: true,
  timestamps: false
});

module.exports = ExpenseClaimComment;
