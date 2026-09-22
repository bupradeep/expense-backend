const { Department } = require('../models');
const { getPagination, toPagedResult } = require('../utils/pagination');

async function createDepartment(data) {
  if (!data.departmentName) throw createError(400, 'departmentName is required');

  return Department.create({
    DepartmentName: data.departmentName,
    IsActive: data.isActive ?? true
  });
}

async function getDepartments(query = {}) {
  const pagination = getPagination(query);

  if (!pagination) {
    return Department.findAll({ order: [['DepartmentId', 'ASC']] });
  }

  const { count, rows } = await Department.findAndCountAll({
    order: [['DepartmentId', 'ASC']],
    limit: pagination.limit,
    offset: pagination.offset
  });

  return toPagedResult(pagination.page, pagination.pageSize, count, rows);
}

async function getDepartmentById(id) {
  const department = await Department.findByPk(id);

  if (!department) {
    throw createError(404, 'Department not found');
  }

  return department;
}

async function updateDepartment(id, data) {
  const department = await getDepartmentById(id);

  if (!data.departmentName) throw createError(400, 'departmentName is required');

  await department.update({
    DepartmentName: data.departmentName,
    IsActive: data.isActive ?? department.IsActive
  });

  return department;
}

async function deleteDepartment(id) {
  const department = await getDepartmentById(id);

  await department.destroy();

  return { message: 'Department deleted successfully' };
}

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
};
