const { Op } = require('sequelize');
const { User, Department } = require('../models');
const { getPagination, toPagedResult } = require('../utils/pagination');

const ROLES = ['Employee', 'Admin', 'Manager', 'Finance', 'DepartmentHead'];
const DEFAULT_ROLE = 'Employee';

const ROLE_FORCED_DEPARTMENT_NAME = {
  Admin: 'Administration',
  Finance: 'Finance'
};

async function createUser(data) {
  if (!data.fullName) throw createError(400, 'FullName is required');
  if (!data.email) throw createError(400, 'Email is required');
  if (!data.employeeCode) throw createError(400, 'EmployeeCode is required');
  if (!data.employeeObjectId) throw createError(400, 'Employee Object Id is required');

  const role = data.role || DEFAULT_ROLE;

  validateRole(role);
  const departmentId = await resolveDepartmentId(role, data.departmentId);
  await validateDepartment(departmentId);
  await validateManager(data.managerId);
  await assertNoDuplicate(data);
  await assertUniqueRole(role, departmentId);

  const user = await User.create({
    FullName: data.fullName,
    Email: data.email,
    EmployeeCode: data.employeeCode,
    Role: role,
    EmployeeObjectId: data.employeeObjectId,
    DepartmentId: departmentId || null,
    ManagerId: data.managerId || null,
    IsActive: data.isActive ?? true,
    CreatedAt: new Date(),
    CreatedBy: data.createdBy || null
  });

  return getUserById(user.UserId);
}

const MANAGER_INCLUDE = { model: User, as: 'Manager', attributes: ['UserId', 'FullName', 'Email'] };

async function getUsers(query = {}) {
  const pagination = getPagination(query);

  if (!pagination) {
    return User.findAll({ include: [{ model: Department }, MANAGER_INCLUDE], order: [['UserId', 'ASC']] });
  }

  const { count, rows } = await User.findAndCountAll({
    include: [{ model: Department }, MANAGER_INCLUDE],
    order: [['UserId', 'ASC']],
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true
  });

  return toPagedResult(pagination.page, pagination.pageSize, count, rows);
}

async function getUserById(id) {
  const user = await User.findByPk(id, { include: [{ model: Department }, MANAGER_INCLUDE] });

  if (!user) {
    throw createError(404, 'User not found');
  }

  return user;
}

async function getUserByEmployeeObjectId(employeeObjectId) {
  const user = await User.findOne({
    where: { EmployeeObjectId: employeeObjectId },
    include: [{ model: Department }, MANAGER_INCLUDE]
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
  const managerId = data.managerId !== undefined ? data.managerId : user.ManagerId;

  validateRole(role);
  const departmentId = await resolveDepartmentId(role, data.departmentId || user.DepartmentId);
  await validateDepartment(departmentId);
  await validateManager(managerId, id);
  await assertNoDuplicate(data, id);
  await assertUniqueRole(role, departmentId, id);

  await user.update({
    FullName: data.fullName,
    Email: data.email,
    EmployeeCode: data.employeeCode,
    Role: role,
    EmployeeObjectId: data.employeeObjectId,
    DepartmentId: departmentId || null,
    ManagerId: managerId || null,
    IsActive: data.isActive ?? user.IsActive,
    UpdatedAt: new Date(),
    UpdatedBy: data.updatedBy || null
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

async function validateManager(managerId, excludeUserId) {
  if (!managerId) return;

  if (excludeUserId && Number(managerId) === Number(excludeUserId)) {
    throw createError(400, 'A user cannot be their own manager');
  }

  const manager = await User.findByPk(managerId);

  if (!manager) {
    throw createError(400, 'managerId does not match an existing user');
  }
}

async function resolveDepartmentId(role, departmentId) {
  const forcedDepartmentName = ROLE_FORCED_DEPARTMENT_NAME[role];

  if (!forcedDepartmentName) return departmentId;

  const [department] = await Department.findOrCreate({
    where: { DepartmentName: forcedDepartmentName },
    defaults: { DepartmentName: forcedDepartmentName, IsActive: true, CreatedAt: new Date() }
  });

  return department.DepartmentId;
}

const SINGLE_INSTANCE_ROLES = ['Admin', 'Finance'];

async function assertUniqueRole(role, departmentId, excludeUserId) {
  if (SINGLE_INSTANCE_ROLES.includes(role)) {
    const where = { Role: role, IsActive: true };
    if (excludeUserId) where.UserId = { [Op.ne]: excludeUserId };

    const existing = await User.findOne({ where });

    if (existing) {
      throw createError(409, `A ${role} user already exists. Only one ${role} is allowed across the organization`);
    }

    return;
  }

  if (role !== 'DepartmentHead') return;

  if (!departmentId) {
    throw createError(400, `departmentId is required for the ${role} role`);
  }

  const where = { Role: role, IsActive: true, DepartmentId: departmentId };
  if (excludeUserId) where.UserId = { [Op.ne]: excludeUserId };

  const existing = await User.findOne({ where });

  if (existing) {
    throw createError(409, `A ${role} already exists for this department`);
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
