# Expense Reimbursement Node.js API

Simple Node.js + Express + SQL Server implementation for the 12-table Expense Reimbursement application.

## Architecture

```text
bin/www
   |
   v
app.js
   |
   +-- controller/
   |      |
   |      +-- expenseController.js
   |      +-- approvalController.js
   |      +-- reimbursementController.js
   |      +-- reportController.js
   |
   +-- services/
   |      |
   |      +-- expenseService.js
   |      +-- approvalService.js
   |      +-- reimbursementService.js
   |      +-- reportService.js
   |
   +-- utils/
          |
          +-- db.js
          +-- queryExecutor.js
          +-- expenseQueries.js
```

## Prerequisites

- Node.js
- SQL Server
- ExpenseReimbursement database
- The 12-table SQL script from the database setup

## Installation

```bash
npm install
```

Copy:

```text
.env.example
```

to:

```text
.env
```

Then update the SQL Server credentials.

For SQL Server Express:

```env
DB_SERVER=localhost\\SQLEXPRESS
DB_DATABASE=ExpenseReimbursement
DB_USER=sa
DB_PASSWORD=YourPassword
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

If SQL Server is using the default instance:

```env
DB_SERVER=localhost
DB_PORT=1433
```

## Start

```bash
npm start
```

Development:

```bash
npm run dev
```

Health check:

```text
GET http://localhost:3000/health
```

## APIs

### Expense

```text
POST   /expenses
GET    /expenses
GET    /expenses/:id
PUT    /expenses/:id
DELETE /expenses/:id
POST   /expenses/:id/submit
GET    /expenses/:id/history
GET    /expenses/:id/receipts
```

### Approval

```text
GET  /approvals/pending?userId=2
POST /approvals/:id/approve
POST /approvals/:id/reject
POST /approvals/:id/send-back
```

### Reimbursement

```text
POST /expenses/:id/payment
```

### Reports

```text
GET /reports/expenses
```

## Create Expense Example

```json
{
  "claimNumber": "EXP-2001",
  "employeeId": 1,
  "departmentId": 1,
  "projectId": 1,
  "claimDate": "2026-09-18",
  "currency": "INR",
  "businessPurpose": "Client meeting",
  "location": "Bangalore",
  "paymentMethod": "Credit Card",
  "remarks": "Client visit",
  "createdBy": 1,
  "items": [
    {
      "categoryId": 2,
      "expenseDate": "2026-09-18",
      "amount": 4500,
      "currency": "INR",
      "merchantName": "ABC Hotel",
      "description": "Hotel stay",
      "businessPurpose": "Client meeting",
      "paymentMethod": "Credit Card"
    },
    {
      "categoryId": 3,
      "expenseDate": "2026-09-18",
      "amount": 800,
      "currency": "INR",
      "merchantName": "XYZ Restaurant",
      "description": "Dinner",
      "businessPurpose": "Client meeting",
      "paymentMethod": "Credit Card"
    }
  ]
}
```

## Submit

```http
POST /expenses/1/submit
Content-Type: application/json
```

```json
{
  "userId": 1
}
```

## Approve

```http
POST /approvals/1/approve
Content-Type: application/json
```

```json
{
  "approverId": 2,
  "approvalLevel": 1,
  "comments": "Approved"
}
```

## Reject

```http
POST /approvals/1/reject
Content-Type: application/json
```

```json
{
  "approverId": 2,
  "approvalLevel": 1,
  "comments": "Receipt is missing"
}
```

## Send Back

```http
POST /approvals/1/send-back
Content-Type: application/json
```

```json
{
  "approverId": 2,
  "approvalLevel": 1,
  "comments": "Please provide the invoice"
}
```

## Payment

```http
POST /expenses/1/payment
Content-Type: application/json
```

```json
{
  "processedBy": 4,
  "paymentReference": "PAY-2001",
  "paymentDate": "2026-09-20",
  "paymentAmount": 5300,
  "paymentMethod": "Bank Transfer",
  "transactionReference": "TXN-12345",
  "paymentRemarks": "Payment completed"
}
```

## Authentication

Authentication/token middleware is intentionally not included yet.

When you are ready, add:

```text
middleware/authMiddleware.js
```

and apply it at the route level or globally.

## Stored Procedures

The current implementation keeps most SQL in:

```text
utils/expenseQueries.js
```

and provides:

```text
utils/queryExecutor.js
```

for both direct SQL and stored procedures.

A stored procedure can be called like:

```js
const { executeStoredProcedure } = require('../utils/queryExecutor');

const result = await executeStoredProcedure(
  'sp_GetExpenseReport',
  {
    FromDate: {
      type: db.sql.Date,
      value: '2026-09-01'
    }
  }
);
```

This lets you gradually move complex queries into SQL Server stored procedures without changing the controller/service architecture.
