const express = require('express');
const router = express.Router();

const departmentService = require('../services/departmentService');
const { requireRole } = require('../middleware/requireRole');

router.post('/', requireRole('Admin'), async (req, res, next) => {
  try {
    req.body.createdBy = req.user.userId;

    const result = await departmentService.createDepartment(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await departmentService.getDepartments(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await departmentService.getDepartmentById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    req.body.updatedBy = req.user.userId;

    const result = await departmentService.updateDepartment(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    const result = await departmentService.deleteDepartment(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
