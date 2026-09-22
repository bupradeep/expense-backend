const express = require('express');
const router = express.Router();

const projectService = require('../services/projectService');

router.post('/', async (req, res, next) => {
  try {
    const result = await projectService.createProject(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await projectService.getProjects(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await projectService.getProjectById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await projectService.updateProject(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await projectService.deleteProject(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
