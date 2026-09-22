const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const Department = sequelize.define('Department', {
  DepartmentId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  DepartmentName: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
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
  tableName: 'Departments',
  freezeTableName: true,
  timestamps: false
});

module.exports = Department;
