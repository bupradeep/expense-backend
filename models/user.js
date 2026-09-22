const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const User = sequelize.define('User', {
  UserId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  FullName: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  Email: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  EmployeeCode: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  EmployeeObjectId: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  Role: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  DepartmentId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'Users',
  freezeTableName: true,
  timestamps: false
});

module.exports = User;
