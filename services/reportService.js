const db = require('../utils/db');
const queries = require('../utils/expenseQueries');

async function getExpenseReport(filters) {
  const pool = await db.getPool();

  const result = await new db.sql.Request(pool)
    .input('FromDate', db.sql.Date, filters.fromDate || null)
    .input('ToDate', db.sql.Date, filters.toDate || null)
    .input('DepartmentId', db.sql.Int, filters.departmentId || null)
    .input('EmployeeId', db.sql.Int, filters.employeeId || null)
    .query(queries.expenseReport);

  return result.recordset;
}

module.exports = {
  getExpenseReport
};
