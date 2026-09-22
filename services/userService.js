const { Op } = require('sequelize');
const { User, Department } = require('../models');

const ROLES = ['Employee', 'Admin', 'Manager', 'Finance', 'FinanceHead', 'DepartmentHead'];
const DEFAULT_ROLE = 'Employee';

async function createUser(data) {
  if (!data.fullName) throw createError(400, 'FullName is required');
  if (!data.email) throw createError(400, 'Email is required');
  if (!data.employeeCode) throw createError(400, 'EmployeeCode is required');
  if (!data.employeeObjectId) throw createError(400, 'Employee Object Id is required');

  const role = data.role || DEFAULT_ROLE;

  validateRole(role);
  await validateDepartment(data.departmentId);
  await assertNoDuplicate(data);

  const user = await User.create({
    FullName: data.fullName,
    Email: data.email,
    EmployeeCode: data.employeeCode,
    Role: role,
    EmployeeObjectId: data.employeeObjectId,
    DepartmentId: data.departmentId || null,
    IsActive: data.isActive ?? true
  });

  return getUserById(user.UserId);
}

async function getUsers() {
  return User.findAll({ include: [{ model: Department }], order: [['UserId', 'ASC']] });
}

async function getUserById(id) {
  const user = await User.findByPk(id, { include: [{ model: Department }] });

  if (!user) {
    throw createError(404, 'User not found');
  }

  return user;
}

async function getUserByEmployeeObjectId(employeeObjectId) {
  const user = await User.findOne({
    where: { EmployeeObjectId: employeeObjectId },
    include: [{ model: Department }]
  });

  if (!user) {
    throw createError(404, 'User not found');
  }

  return user;
}

async function updateUser(id, data) {
  const user = await getUserById(id);

  if (!data.fullName) throw createError(400, 'FullName is required');
  if (!data.email) throw createError(400, 'Email is required');
  if (!data.employeeCode) throw createError(400, 'EmployeeCode is required');
  if (!data.employeeObjectId) throw createError(400, 'Employee Object Id is required');

  const role = data.role || user.Role;
  const departmentId = data.departmentId || user.DepartmentId;

  validateRole(role);
  await validateDepartment(departmentId);
  await assertNoDuplicate(data, id);

  await user.update({
    FullName: data.fullName,
    Email: data.email,
    EmployeeCode: data.employeeCode,
    Role: role,
    EmployeeObjectId: data.employeeObjectId,
    DepartmentId: departmentId || null,
    IsActive: data.isActive ?? user.IsActive
  });

  return getUserById(id);
}

function validateRole(role) {
  if (!ROLES.includes(role)) {
    throw createError(400, `Role must be one of: ${ROLES.join(', ')}`);
  }
}

async function validateDepartment(departmentId) {
  if (!departmentId) return;

  const department = await Department.findByPk(departmentId);

  if (!department) {
    throw createError(400, 'departmentId does not match an existing department');
  }
}

async function deleteUser(id) {
  const user = await getUserById(id);

  await user.destroy();

  return { message: 'User deleted successfully' };
}

async function assertNoDuplicate(data, excludeUserId) {
  const where = {
    [Op.or]: [
      { Email: data.email },
      { EmployeeCode: data.employeeCode },
      { EmployeeObjectId: data.employeeObjectId }
    ]
  };

  if (excludeUserId) {
    where.UserId = { [Op.ne]: excludeUserId };
  }

  const existing = await User.findOne({ where });

  if (!existing) return;

  if (existing.Email === data.email) {
    throw createError(409, 'A user with this email already exists');
  }

  if (existing.EmployeeCode === data.employeeCode) {
    throw createError(409, 'A user with this employeeCode already exists');
  }

  throw createError(409, 'A user with this employeeObjectId already exists');
}

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  createUser,
  getUsers,
  getUserById,
  getUserByEmployeeObjectId,
  updateUser,
  deleteUser
};
