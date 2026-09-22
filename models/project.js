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
  }
}, {
  tableName: 'Projects',
  freezeTableName: true,
  timestamps: false
});

module.exports = Project;
