const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const ExpenseCategory = sequelize.define('ExpenseCategory', {
  CategoryId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  CategoryName: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'ExpenseCategories',
  freezeTableName: true,
  timestamps: false
});

module.exports = ExpenseCategory;
