const express = require('express');
const cors = require('cors');

const expenseController = require('./controller/expenseController');
const approvalController = require('./controller/approvalController');
const reimbursementController = require('./controller/reimbursementController');
const reportController = require('./controller/reportController');
const userController = require('./controller/userController');
const departmentController = require('./controller/departmentController');
const projectController = require('./controller/projectController');
const categoryController = require('./controller/categoryController');
const policyRuleController = require('./controller/policyRuleController');
const approvalRuleController = require('./controller/approvalRuleController');
const expenseItemCrudController = require('./controller/expenseItemCrudController');
const expenseReceiptCrudController = require('./controller/expenseReceiptCrudController');
const reimbursementCrudController = require('./controller/reimbursementCrudController');
const auditLogController = require('./controller/auditLogController');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({
    message: 'Expense Reimbursement API is running'
  });
});

// Expense APIs
app.use('/expenses', expenseController);

// Approval APIs
app.use('/approvals', approvalController);

// Reimbursement APIs
app.use('/expenses', reimbursementController);

// Report APIs
app.use('/reports', reportController);

// Master data CRUD APIs
app.use('/users', userController);
app.use('/departments', departmentController);
app.use('/projects', projectController);
app.use('/expense-categories', categoryController);
app.use('/policy-rules', policyRuleController);
app.use('/approval-rules', approvalRuleController);

// Expense detail CRUD APIs
app.use('/expense-items', expenseItemCrudController);
app.use('/expense-receipts', expenseReceiptCrudController);
app.use('/reimbursements', reimbursementCrudController);

// Audit log (filter-only) API
app.use('/audit-logs', auditLogController);

// 404
app.use((req, res) => {
  res.status(404).json({
    message: 'API endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
});

module.exports = app;
