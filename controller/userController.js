const express = require('express');
const router = express.Router();

const userService = require('../services/userService');

router.post('/', async (req, res, next) => {
  try {
    const result = await userService.createUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await userService.getUsers();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/by-employee-object-id/:employeeObjectId', async (req, res, next) => {
  try {
    const result = await userService.getUserByEmployeeObjectId(req.params.employeeObjectId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await userService.getUserById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await userService.updateUser(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await userService.deleteUser(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
