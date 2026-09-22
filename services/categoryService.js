const { ExpenseCategory } = require('../models');

async function createCategory(data) {
  if (!data.categoryName) throw createError(400, 'categoryName is required');

  return ExpenseCategory.create({
    CategoryName: data.categoryName,
    IsActive: data.isActive ?? true
  });
}

async function getCategories() {
  return ExpenseCategory.findAll({ order: [['CategoryId', 'ASC']] });
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

  await category.update({
    CategoryName: data.categoryName,
    IsActive: data.isActive ?? category.IsActive
  });

  return category;
}

async function deleteCategory(id) {
  const category = await getCategoryById(id);

  await category.destroy();

  return { message: 'Expense category deleted successfully' };
}

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};
