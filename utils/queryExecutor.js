const db = require('./db');

async function executeQuery(query, parameters = {}) {
  const pool = await db.getPool();
  const request = new db.sql.Request(pool);

  for (const [name, parameter] of Object.entries(parameters)) {
    request.input(name, parameter.type, parameter.value);
  }

  return request.query(query);
}

async function executeStoredProcedure(procedureName, parameters = {}) {
  const pool = await db.getPool();
  const request = new db.sql.Request(pool);

  for (const [name, parameter] of Object.entries(parameters)) {
    request.input(name, parameter.type, parameter.value);
  }

  return request.execute(procedureName);
}

module.exports = {
  executeQuery,
  executeStoredProcedure
};
