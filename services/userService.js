const { Op } = require('sequelize');
const { User } = require('../models');

async function createUser(data) {
  if (!data.fullName) throw createError(400, 'FullName is required');
  if (!data.email) throw createError(400, 'Email is required');
  if (!data.employeeCode) throw createError(400, 'EmployeeCode is required');
  if (!data.role) throw createError(400, 'Role is required');
  if (!data.employeeObjectId) throw createError(400, 'Employee Object Id is required');

  await assertNoDuplicate(data);

  const user = await User.create({
    FullName: data.fullName,
    Email: data.email,
    EmployeeCode: data.employeeCode,
    Role: data.role,
    EmployeeObjectId: data.employeeObjectId,
    IsActive: data.isActive ?? true
  });

  return user;
}

async function getUsers() {
  return User.findAll({ order: [['UserId', 'ASC']] });
}

async function getUserById(id) {
  const user = await User.findByPk(id);

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
  if (!data.role) throw createError(400, 'Role is required');
  if (!data.employeeObjectId) throw createError(400, 'Employee Object Id is required');

  await assertNoDuplicate(data, id);

  await user.update({
    FullName: data.fullName,
    Email: data.email,
    EmployeeCode: data.employeeCode,
    Role: data.role,
    EmployeeObjectId: data.employeeObjectId,
    IsActive: data.isActive ?? user.IsActive
  });

  return user;
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
  updateUser,
  deleteUser
};
