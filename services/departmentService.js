const { Department } = require('../models');

async function createDepartment(data) {
  if (!data.departmentName) throw createError(400, 'departmentName is required');

  return Department.create({
    DepartmentName: data.departmentName,
    IsActive: data.isActive ?? true
  });
}

async function getDepartments() {
  return Department.findAll({ order: [['DepartmentId', 'ASC']] });
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
