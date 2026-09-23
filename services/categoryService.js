const { Op } = require('sequelize');
const { ExpenseCategory } = require('../models');
const { getPagination, toPagedResult } = require('../utils/pagination');
const { createError } = require('../utils/httpError');

async function createCategory(data) {
  if (!data.categoryName) throw createError(400, 'categoryName is required');

  await assertNoDuplicate(data);

  return ExpenseCategory.create({
    CategoryName: data.categoryName,
    IsActive: data.isActive ?? true,
    CreatedAt: new Date(),
    CreatedBy: data.createdBy || null
  });
}

async function getCategories(query = {}) {
  const pagination = getPagination(query);

  if (!pagination) {
    return ExpenseCategory.findAll({ order: [['CategoryId', 'ASC']] });
  }

  const { count, rows } = await ExpenseCategory.findAndCountAll({
    order: [['CategoryId', 'ASC']],
    limit: pagination.limit,
    offset: pagination.offset
  });

  return toPagedResult(pagination.page, pagination.pageSize, count, rows);
}

async function getCategoryById(id) {
  const category = await ExpenseCategory.findByPk(id);

  if (!category) {
    throw createError(404, 'Expense category not found');
  }

  return category;
}

async function updateCategory(id, data) {
  const category = await getCategoryById(id);

  if (!data.categoryName) throw createError(400, 'categoryName is required');

  await assertNoDuplicate(data, id);

  await category.update({
    CategoryName: data.categoryName,
    IsActive: data.isActive ?? category.IsActive,
    UpdatedAt: new Date(),
    UpdatedBy: data.updatedBy || null
  });

  return category;
}

async function deleteCategory(id) {
  const category = await getCategoryById(id);

  await category.destroy();

  return { message: 'Expense category deleted successfully' };
}

async function assertNoDuplicate(data, excludeCategoryId) {
  const where = { CategoryName: data.categoryName };

  if (excludeCategoryId) {
    where.CategoryId = { [Op.ne]: excludeCategoryId };
  }

  const existing = await ExpenseCategory.findOne({ where });

  if (existing) {
    throw createError(409, 'An expense category with this categoryName already exists');
  }
}

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};
