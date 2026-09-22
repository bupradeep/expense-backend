const { Op } = require('sequelize');
const { Project } = require('../models');

async function createProject(data) {
  if (!data.projectName) throw createError(400, 'projectName is required');
  if (!data.projectCode) throw createError(400, 'projectCode is required');

  await assertNoDuplicate(data);

  return Project.create({
    ProjectName: data.projectName,
    ProjectCode: data.projectCode,
    ClientName: data.clientName || null,
    CostCenter: data.costCenter || null,
    IsActive: data.isActive ?? true
  });
}

async function getProjects() {
  return Project.findAll({ order: [['ProjectId', 'ASC']] });
}

async function getProjectById(id) {
  const project = await Project.findByPk(id);

  if (!project) {
    throw createError(404, 'Project not found');
  }

  return project;
}

async function updateProject(id, data) {
  const project = await getProjectById(id);

  if (!data.projectName) throw createError(400, 'projectName is required');
  if (!data.projectCode) throw createError(400, 'projectCode is required');

  await assertNoDuplicate(data, id);

  await project.update({
    ProjectName: data.projectName,
    ProjectCode: data.projectCode,
    ClientName: data.clientName || null,
    CostCenter: data.costCenter || null,
    IsActive: data.isActive ?? project.IsActive
  });

  return project;
}

async function deleteProject(id) {
  const project = await getProjectById(id);

  await project.destroy();

  return { message: 'Project deleted successfully' };
}

async function assertNoDuplicate(data, excludeProjectId) {
  const where = { ProjectCode: data.projectCode };

  if (excludeProjectId) {
    where.ProjectId = { [Op.ne]: excludeProjectId };
  }

  const existing = await Project.findOne({ where });

  if (existing) {
    throw createError(409, 'A project with this projectCode already exists');
  }
}

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
};
