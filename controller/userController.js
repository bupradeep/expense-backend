const express = require('express');
const router = express.Router();

const userService = require('../services/userService');
const { requireRole } = require('../middleware/requireRole');

router.post('/', requireRole('Admin'), async (req, res, next) => {
  try {
    req.body.createdBy = req.user.userId;

    const result = await userService.createUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Finance also needs this list -- the SPFx app reuses the Approval History and Reports admin
// screens for Finance, and both populate a user-name dropdown (Approver / Employee filter) from it.
router.get('/', requireRole('Admin', 'Finance'), async (req, res, next) => {
  try {
    const result = await userService.getUsers(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Used by clients to resolve "who am I" from the signed-in user's own Azure AD object id -- so
// self-lookup is allowed for everyone, but looking up someone else's profile this way is Admin-only
// (this route previously let any authenticated user enumerate any other user's full profile).
router.get('/by-employee-object-id/:employeeObjectId', async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin' && req.user.employeeObjectId !== req.params.employeeObjectId) {
      return res.status(403).json({ message: 'You can only look up your own profile' });
    }

    const result = await userService.getUserByEmployeeObjectId(req.params.employeeObjectId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    const result = await userService.getUserById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    req.body.updatedBy = req.user.userId;

    const result = await userService.updateUser(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    const result = await userService.deleteUser(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
