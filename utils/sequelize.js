const { Sequelize, DataTypes } = require('sequelize');
const moment = require('moment');
require('dotenv').config();

// Sequelize formats DataTypes.DATE values with a trailing UTC offset (e.g. "... +00:00"), which
// only plain SQL Server DATETIMEOFFSET columns accept via implicit conversion. This database's
// date/time columns are physically DATETIME (no offset), so that format makes every write with a
// DATE field fail with "Conversion failed when converting date and/or time from character string."
// Override the serialization to the plain DATETIME-compatible format instead.
DataTypes.DATE.prototype._stringify = function stringifyForMssqlDatetime(date, options) {
  const value = moment.isMoment(date) ? date : this._applyTimezone(date, options);
  return value.format('YYYY-MM-DD HH:mm:ss.SSS');
};

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
