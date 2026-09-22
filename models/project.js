const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const Project = sequelize.define('Project', {
  ProjectId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ProjectName: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  ProjectCode: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  ClientName: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  CostCenter: {
    type: DataTypes.STRING(50),
    allowNull: true
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
  tableName: 'Projects',
  freezeTableName: true,
  timestamps: false
});

module.exports = Project;
