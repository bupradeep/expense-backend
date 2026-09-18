const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate:
      process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
  },
  pool: {
    max: Number(process.env.DB_POOL_MAX || 10),
    min: Number(process.env.DB_POOL_MIN || 0),
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT || 30000)
  }
};

let poolPromise;

async function connect() {
  if (!poolPromise) {
    poolPromise = sql.connect(config);
  }

  return poolPromise;
}

async function getPool() {
  return connect();
}

async function close() {
  if (poolPromise) {
    const pool = await poolPromise;
    await pool.close();
    poolPromise = null;
  }
}

module.exports = {
  sql,
  connect,
  getPool,
  close
};
