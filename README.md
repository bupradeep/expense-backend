# Expense Reimbursement Node.js API

Node.js + Express + SQL Server implementation for the 12-table Expense Reimbursement application, using Sequelize as the ORM.

## Architecture

```text
bin/www
   |
   v
app.js
   |
   +-- controller/     (Express routers)
   |
   +-- services/        (business logic, built on the Sequelize models)
   |
   +-- models/           (Sequelize model definitions + associations, models/index.js)
   |
   +-- utils/
          |
          +-- sequelize.js   (Sequelize instance / DB connection)
```

Every table has a Sequelize model in `models/`, with associations (belongsTo/hasMany) wired up in `models/index.js`. Services query through these models instead of raw SQL.

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

### Master data (Users, Departments, Projects, Expense Categories, Policy Rules, Approval Rules)

```text
POST   /users
GET    /users
GET    /users/:id
PUT    /users/:id
DELETE /users/:id

POST   /departments
GET    /departments
GET    /departments/:id
PUT    /departments/:id
DELETE /departments/:id

POST   /projects
GET    /projects
GET    /projects/:id
PUT    /projects/:id
DELETE /projects/:id

POST   /expense-categories
GET    /expense-categories
GET    /expense-categories/:id
PUT    /expense-categories/:id
DELETE /expense-categories/:id

POST   /policy-rules
GET    /policy-rules
GET    /policy-rules/:id
PUT    /policy-rules/:id
DELETE /policy-rules/:id

POST   /approval-rules
GET    /approval-rules
GET    /approval-rules/:id
PUT    /approval-rules/:id
DELETE /approval-rules/:id
```

### Expense items, receipts and reimbursements (standalone CRUD)

```text
POST   /expense-items
GET    /expense-items?expenseClaimId=1
GET    /expense-items/:id
PUT    /expense-items/:id
DELETE /expense-items/:id

POST   /expense-receipts
GET    /expense-receipts?expenseClaimId=1
GET    /expense-receipts/:id
PUT    /expense-receipts/:id
DELETE /expense-receipts/:id

POST   /reimbursements
GET    /reimbursements?expenseClaimId=1
GET    /reimbursements/:id
PUT    /reimbursements/:id
DELETE /reimbursements/:id
```

### Audit logs (filter-only)

```text
GET /audit-logs?fromDate=&toDate=&userId=&expenseClaimId=&status=
```

All filters are optional.

### Approval history (filter-only)

```text
GET /approvals/history?fromDate=&toDate=&status=&approverId=&expenseClaimId=
```

All filters are optional.

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

## Database access (Sequelize)

All data access goes through Sequelize models in `models/`, connected via the instance in `utils/sequelize.js` (SQL Server dialect, using the `tedious` driver, configured from the same `.env` variables as before).

To query a table directly from a service:

```js
const { ExpenseClaim } = require('../models');

const claim = await ExpenseClaim.findByPk(1);
```

Associations between tables (e.g. an expense claim's employee, items, and receipts) are defined once in `models/index.js` and can be eager-loaded with `include`.
