const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_SERVER,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  dialect: 'mssql',
  logging: false,
  dialectOptions: {
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
    }
  },
  pool: {
    max: Number(process.env.DB_POOL_MAX || 10),
    min: Number(process.env.DB_POOL_MIN || 0),
    idle: Number(process.env.DB_POOL_IDLE_TIMEOUT || 30000)
  }
});

module.exports = sequelize;
