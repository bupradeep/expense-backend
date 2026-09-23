const { Op } = require('sequelize');
const { Department } = require('../models');
const { getPagination, toPagedResult } = require('../utils/pagination');
const { createError } = require('../utils/httpError');

async function createDepartment(data) {
  if (!data.departmentName) throw createError(400, 'departmentName is required');

  await assertNoDuplicate(data);

  return Department.create({
    DepartmentName: data.departmentName,
    IsActive: data.isActive ?? true,
    CreatedAt: new Date(),
    CreatedBy: data.createdBy || null
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

  await assertNoDuplicate(data, id);

  await department.update({
    DepartmentName: data.departmentName,
    IsActive: data.isActive ?? department.IsActive,
    UpdatedAt: new Date(),
    UpdatedBy: data.updatedBy || null
  });

  return department;
}

async function deleteDepartment(id) {
  const department = await getDepartmentById(id);

  await department.destroy();

  return { message: 'Department deleted successfully' };
}

async function assertNoDuplicate(data, excludeDepartmentId) {
  const where = { DepartmentName: data.departmentName };

  if (excludeDepartmentId) {
    where.DepartmentId = { [Op.ne]: excludeDepartmentId };
  }

  const existing = await Department.findOne({ where });

  if (existing) {
    throw createError(409, 'A department with this name already exists');
  }
}

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
};
