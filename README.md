# Expense Reimbursement Node.js API

Node.js + Express + SQL Server implementation for the 12-table Expense Reimbursement application, using Sequelize as the ORM.

## Architecture

```text
bin/www
   |
   v
app.js
   |
   +-- middleware/
   |      |
   |      +-- authMiddleware.js  (validates the Azure AD bearer token on every route below /health)
   |
   +-- controller/     (Express routers)
   |
   +-- services/        (business logic, built on the Sequelize models)
   |
   +-- models/           (Sequelize model definitions + associations, models/index.js)
   |
   +-- utils/
          |
          +-- sequelize.js          (Sequelize instance / DB connection)
          +-- mailer.js             (status-change email notifications)
          +-- httpError.js          (shared createError(status, message) helper used by every service)
          +-- pagination.js         (shared getPagination/toPagedResult helpers)
          +-- graphClient.js        (app-only Microsoft Graph client)
          +-- receiptStorage.js     (multer config: parses uploaded receipt files into memory)
          +-- receiptDriveStorage.js (uploads/downloads/deletes receipts in a SharePoint library via Graph)
```

Every table has a Sequelize model in `models/`, with associations (belongsTo/hasMany) wired up in `models/index.js`. Services query through these models instead of raw SQL.

## Prerequisites

- Node.js
- SQL Server
- ExpenseReimbursement database
- The 12-table SQL script from the database setup
- An Azure AD (Entra ID) app registration -- every API route requires a bearer token from it (see [Authentication](#authentication))
- Optional: a SharePoint site + document library, if you want receipt files stored there (see [Receipt storage](#receipt-storage))

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

The rest of `.env.example` covers three feature areas, each documented in its own section below: Azure AD auth (required -- every route needs it), mail notifications (optional, defaults to a sandbox provider), and SharePoint receipt storage (optional).

## Start

```bash
npm start
```

Development:

```bash
npm run dev
```

Health check (the only route that does **not** require a bearer token):

```text
GET http://localhost:3000/health
```

## Postman collection

`postman/ExpenseReimbursementAPI.postman_collection.json` has a ready-to-import request for every route below, grouped into folders that match this README (Expenses, Approvals, Reimbursement, Expense Items, Expense Receipts, Users, Departments, Projects, Expense Categories, Policy Rules, Approval Rules, Reports, Audit Logs), with example request bodies matching the ones in this file.

Import it, then set these collection variables before running anything:

- `baseUrl` -- defaults to `http://localhost:3000`
- `bearerToken` -- a valid Azure AD token for a user already provisioned in the `Users` table (see [Authentication](#authentication)); every request inherits this as its Bearer auth
- The `*Id` variables (`userId`, `departmentId`, `expenseClaimId`, ...) -- default to `1`/`2`; point them at real rows in your database

The `postman/` folder is gitignored, so this file stays local -- re-export/share it separately if your team needs a shared copy.

## APIs

Every route below requires `Authorization: Bearer <token>` -- see [Authentication](#authentication). Most routes are additionally role-gated -- see [Authorization](#authorization) for the full matrix.

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
GET    /expenses/:id/comments
POST   /expenses/:id/comments
```

`POST /expenses` (creating a claim) is limited to **Employee, Manager, DepartmentHead** -- Finance and Admin cannot file expense claims for themselves (`services/expenseService.js`'s `assertCanCreateClaim`). Every other route on a specific claim (`:id`) is limited to that claim's own employee, an Admin, or (for the read routes only) anyone holding an approver-capable role (Manager/DepartmentHead/Finance); `GET /expenses` without an explicit `employeeId` is scoped to the caller's own claims unless they're Admin or an approver role.

### Approval

```text
GET  /approvals/pending?userId=2
GET  /approvals/history?fromDate=&toDate=&status=&approverId=&expenseClaimId=
POST /approvals/:id/approve
POST /approvals/:id/reject
POST /approvals/:id/send-back
```

Action routes (`approve`/`reject`/`send-back`) are limited to **Manager, DepartmentHead, Finance** (or Admin). Which of those three roles can actually act on a *given* claim is resolved automatically from the claim's current stage (see [Approval workflow](#approval-workflow) below) -- a Manager can't approve a claim that's already at the Finance stage, for example.

### Reimbursement

```text
POST /expenses/:id/payment
```

Limited to **Finance** (or Admin) -- this is the only supported way to record a payment; it also flips the claim's `Status` to `Reimbursed` and sends the reimbursed notification (see [Email notifications](#email-notifications)).

### Reports

```text
GET /reports/expenses
GET /reports/dashboard
```

`GET /reports/expenses` is Admin or Finance (the SPFx app's Reports screen is shared with Finance); `GET /reports/dashboard` is Admin-only. Both expose org-wide financial data across every employee and department.

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

All of the above (Users, Departments, Projects, Expense Categories, Policy Rules, Approval Rules) require **Admin**, with a few exceptions:

- `GET` on Departments/Projects/Expense Categories is open to any authenticated role, since regular employees need those for dropdowns when filing a claim.
- `GET /users` (the list) is also Admin **or Finance** -- the SPFx app's Approval History and Reports admin screens are shared with Finance, and both populate an approver/employee filter dropdown from this list.
- `GET /users/by-employee-object-id/:employeeObjectId` is open to everyone, but only for looking up *your own* profile (matched against the caller's own token) -- looking up someone else's this way requires Admin.

`GET /users/:id`, and every write on Users, stays Admin-only.

`POST /users` and `PUT /users/:id` additionally enforce a few role rules server-side (409 on conflict):

- **Admin** and **Finance** are each limited to one active user across the whole organization (not per-department).
- Setting `role` to `Admin` or `Finance` auto-assigns `departmentId` to a matching "Administration"/"Finance" department (created on first use if it doesn't exist yet), overriding whatever `departmentId` was submitted.
- **DepartmentHead** is limited to one active user per department; `departmentId` is required for that role.

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

Expense items and receipts are limited to their parent claim's owner (or Admin) for writes -- and, like the claim itself, only while it's still `Draft` or `Sent Back`. Reads are open to the claim's owner, Admin, or any approver-capable role (Manager/DepartmentHead/Finance). `/reimbursements` (this raw CRUD form, distinct from `POST /expenses/:id/payment` above) requires **Finance** (or Admin) for every method, including `GET`.

### Audit logs (filter-only)

```text
GET /audit-logs?fromDate=&toDate=&userId=&expenseClaimId=&status=
```

Admin-only. All filters are optional.

## Create Expense Example

Caller must be Employee, Manager, or DepartmentHead (see [Authorization](#authorization)); `employeeId`/`createdBy` are always the authenticated caller regardless of what's in the body.

```json
{
  "claimNumber": "EXP-2001",
  "employeeId": 1,
  "departmentId": 1,
  "projectId": 1,
  "claimDate": "2026-09-18",
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
      "merchantName": "ABC Hotel",
      "description": "Hotel stay",
      "businessPurpose": "Client meeting",
      "paymentMethod": "Credit Card"
    },
    {
      "categoryId": 3,
      "expenseDate": "2026-09-18",
      "amount": 800,
      "merchantName": "XYZ Restaurant",
      "description": "Dinner",
      "businessPurpose": "Client meeting",
      "paymentMethod": "Credit Card"
    }
  ]
}
```

## Submit

Moves the claim out of `Draft`/`Sent Back` into its starting approval stage -- see [Approval workflow](#approval-workflow) for how that stage is chosen.

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

Every route except `GET /health` requires a valid Azure AD (Entra ID) bearer token, validated by `middleware/authMiddleware.js` (applied globally in `app.js`):

```text
Authorization: Bearer <token>
```

The token's signature is verified against the tenant's JWKS endpoint, and its `iss`/`aud`/expiry are checked against `AZURE_TENANT_ID`/`AZURE_CLIENT_ID`. Both v1.0 (`sts.windows.net`) and v2.0 (`login.microsoftonline.com`) issuer formats are accepted, since SPFx's built-in token provider returns v1.0 tokens while other clients may present v2.0.

The token's `oid` (or `sub`) claim is then looked up against `Users.EmployeeObjectId` to resolve the caller to an application user -- so every Azure AD identity that calls the API must already have a matching, active row in the `Users` table, or the request is rejected:

- No `AZURE_TENANT_ID`/`AZURE_CLIENT_ID` configured -> `500`
- Missing/malformed/expired token -> `401`
- Token valid but no `Users` row matches its `oid`/`sub` -> `403` ("No user is provisioned for this identity")
- Matching user found but `IsActive` is `false` -> `403`

On success, `req.user` is populated (`userId`, `fullName`, `email`, `role`, `departmentId`, `employeeObjectId`) for downstream controllers/services to use -- this is what `createdBy`/`updatedBy`/`approverId`/etc. are set from, never a client-supplied value.

## Authorization

Authentication (above) only establishes *who* the caller is; authorization decides what they're allowed to do with that identity, enforced two ways:

- **Route-level role gate** -- `middleware/requireRole(...roles)`, applied per-route in the controllers. `Admin` is always allowed through, in addition to whatever roles are explicitly listed, matching the "Admin can act on anything" convention used throughout the service layer.
- **Ownership checks in the service layer** -- for resources scoped to a specific claim (the claim itself, its items, receipts, comments, history), `requireRole` alone isn't enough (a Manager and an Employee are both allowed to *have* claims, but neither should see someone else's). These are checked against `EmployeeId`/`Status` inside `expenseService.js`, `expenseItemCrudService.js` and `expenseReceiptCrudService.js`.

| Resource | Create/Update/Delete | Read |
|---|---|---|
| Expense claims (`/expenses`) | Employee, Manager, DepartmentHead (own claims only; Draft/Sent Back only) | Owner, Admin, or any approver role (Manager/DepartmentHead/Finance) |
| Expense items/receipts (`/expense-items`, `/expense-receipts`) | Claim owner (own claims only; Draft/Sent Back only) | Claim owner, Admin, or any approver role |
| Approvals (`/approvals/:id/approve\|reject\|send-back`) | Manager, DepartmentHead, Finance -- exact role/department/personal-manager match is resolved per-claim by `approvalService.js`, see [Approval workflow](#approval-workflow) | -- |
| Reimbursement (`/expenses/:id/payment`, `/reimbursements`) | Finance | Finance (the standalone `/reimbursements` CRUD requires Finance for `GET` too) |
| Users, Departments, Projects, Expense Categories, Policy Rules, Approval Rules | Admin | Admin, except `GET` on Departments/Projects/Expense Categories (any role), `GET /users` list (Admin or Finance), and self-lookup on `GET /users/by-employee-object-id/:id` (any role) |
| Reports | -- | `GET /reports/expenses`: Admin or Finance. `GET /reports/dashboard`: Admin only |
| Audit logs | -- | Admin |

A role check failure returns `403`.

## Approval workflow

An expense claim moves through up to three stages after submission, each requiring approval from a specific role before advancing:

```text
Manager -> DepartmentHead -> Finance -> Approved
```

Which stage a claim *starts* at, and whether it skips a stage, is driven entirely by `ApprovalRule` rows (`/approval-rules`) matched against the claim's `TotalAmount`:

- On submit, `approvalService.getStartingStage(amount)` looks for an active level-1 `ApprovalRule` covering that amount. If one exists, the claim starts at whatever role that rule names (e.g. a small-claim rule could route straight to Finance, skipping Manager entirely). With no matching rule, **Manager** is the default starting stage.
- On each approval, `getNextStageRole(amount, currentLevel)` looks for an active rule at `currentLevel + 1` covering that amount. If found, the claim advances to that role's stage; if not, the claim becomes fully `Approved`.

Who may act at a given stage is also scope-checked (`approvalService.js`'s `APPROVAL_STAGES`):

- **Manager** stage -- only the specific person recorded as the claim's employee's `ManagerId`, not just anyone with the Manager role. If the employee has no manager mapped, this stage is auto-approved (with an `ApprovalHistory` entry explaining why) so the claim never gets stuck.
- **DepartmentHead** stage -- anyone with that role in the claim's own department.
- **Finance** stage -- anyone with that role, tenant-wide.

Admin can act at any stage regardless of the above. The submitter is emailed on every stage transition (see [Email notifications](#email-notifications)); whoever can act at the next stage is emailed too.

## Email notifications

`utils/mailer.js` sends the submit/approve/reject/send-back/reimburse notification emails (see `services/notificationService.js`) via `MAIL_PROVIDER` in `.env`:

- **`ethereal`** (default) -- a sandbox test provider. Nothing reaches a real inbox; each send logs a preview URL (`https://ethereal.email/...`) to the server console instead. Safe default for local development.
- **`smtp`** -- real delivery through any SMTP server/relay (Office 365, Gmail, SendGrid, Mailgun, Amazon SES, ...). Requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`.

  > Microsoft 365/Outlook mailboxes frequently reject SMTP AUTH (basic auth) by policy (`535 5.7.139 ... SmtpClientAuthenticationDisabled`), independent of whether the credentials are correct. If you hit that, either have an admin enable SMTP AUTH for the mailbox (Exchange Online: `Set-CASMailbox -SmtpClientAuthenticationDisabled $false`), generate an app password if the account has 2-step verification, or point `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` at a third-party relay instead.

A failed send is logged (`console.error`) and swallowed, not thrown -- a notification failure never fails the underlying API request (submit/approve/reject/etc. still succeeds even if the email doesn't send).

## Receipt storage

Expense receipt files (`POST /expense-receipts`, `multipart/form-data` with a `file` field) are parsed into memory by `utils/receiptStorage.js` (multer, 20 MB limit) and then uploaded to a SharePoint document library via Microsoft Graph (`utils/receiptDriveStorage.js`), using the app-only Graph client in `utils/graphClient.js`.

This reuses the `AZURE_CLIENT_ID` app registration from [Authentication](#authentication), but additionally needs:

- `AZURE_CLIENT_SECRET` -- a client secret on that same app registration
- The `Sites.ReadWrite.All` (or narrower, `Files.ReadWrite.All`) **application** permission, admin-consented
- `SHAREPOINT_SITE_ID` -- the target SharePoint site
- `SHAREPOINT_RECEIPTS_LIBRARY_NAME` -- the document library receipts are uploaded into, resolved by name at runtime (so it keeps working even if the library gets recreated and its underlying drive id changes)

Files up to 4 MiB use Graph's simple upload; larger files (up to the 20 MB multer limit) use a chunked resumable upload session.

## Database access (Sequelize)

All data access goes through Sequelize models in `models/`, connected via the instance in `utils/sequelize.js` (SQL Server dialect, using the `tedious` driver, configured from the same `.env` variables as before).

To query a table directly from a service:

```js
const { ExpenseClaim } = require('../models');

const claim = await ExpenseClaim.findByPk(1);
```

Associations between tables (e.g. an expense claim's employee, items, and receipts) are defined once in `models/index.js` and can be eager-loaded with `include`.
