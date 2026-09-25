// Route-level authorization gate, applied after authenticate (req.user.role must already be set).
// Admin is always allowed, matching the "Admin can act on anything" convention already used
// throughout the service layer (see assertIsOwnerOrAdmin in expenseService.js, and the Admin
// bypass in approvalService.js's processApproval).
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (req.user.role === 'Admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    res.status(403).json({ message: `Only ${allowedRoles.join(', ')} (or Admin) can perform this action` });
  };
}

module.exports = { requireRole };
