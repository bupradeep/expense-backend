const { Project } = require('../models');

async function createProject(data) {
  if (!data.projectName) throw createError(400, 'projectName is required');

  return Project.create({
    ProjectName: data.projectName,
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

  await project.update({
    ProjectName: data.projectName,
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
