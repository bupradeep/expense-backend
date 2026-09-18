const express = require('express');
const cors = require('cors');

const expenseController = require('./controller/expenseController');
const approvalController = require('./controller/approvalController');
const reimbursementController = require('./controller/reimbursementController');
const reportController = require('./controller/reportController');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({
    success: true,
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

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

module.exports = app;
