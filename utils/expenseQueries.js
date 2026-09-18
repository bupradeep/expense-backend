const insertClaim = `
INSERT INTO ExpenseClaims
(
    ClaimNumber,
    EmployeeId,
    DepartmentId,
    ProjectId,
    ClaimDate,
    TotalAmount,
    Currency,
    BusinessPurpose,
    Location,
    PaymentMethod,
    Remarks,
    Status,
    CreatedAt,
    CreatedBy
)
OUTPUT INSERTED.ExpenseClaimId
VALUES
(
    @ClaimNumber,
    @EmployeeId,
    @DepartmentId,
    @ProjectId,
    @ClaimDate,
    0,
    @Currency,
    @BusinessPurpose,
    @Location,
    @PaymentMethod,
    @Remarks,
    'Draft',
    GETDATE(),
    @CreatedBy
);
`;

const insertExpenseItem = `
INSERT INTO ExpenseItems
(
    ExpenseClaimId,
    CategoryId,
    ExpenseDate,
    Amount,
    Currency,
    MerchantName,
    Description,
    BusinessPurpose,
    PaymentMethod,
    IsPolicyException,
    PolicyExceptionReason,
    CreatedAt,
    CreatedBy
)
VALUES
(
    @ExpenseClaimId,
    @CategoryId,
    @ExpenseDate,
    @Amount,
    @Currency,
    @MerchantName,
    @Description,
    @BusinessPurpose,
    @PaymentMethod,
    @IsPolicyException,
    @PolicyExceptionReason,
    GETDATE(),
    @CreatedBy
);
`;

const recalculateClaimTotal = `
UPDATE ExpenseClaims
SET
    TotalAmount = (
        SELECT ISNULL(SUM(Amount), 0)
        FROM ExpenseItems
        WHERE ExpenseClaimId = @ExpenseClaimId
    ),
    UpdatedAt = GETDATE()
WHERE ExpenseClaimId = @ExpenseClaimId;
`;

const getClaims = `
SELECT
    ec.ExpenseClaimId,
    ec.ClaimNumber,
    ec.EmployeeId,
    u.FullName AS EmployeeName,
    ec.DepartmentId,
    d.DepartmentName,
    ec.ProjectId,
    p.ProjectName,
    ec.ClaimDate,
    ec.TotalAmount,
    ec.Currency,
    ec.BusinessPurpose,
    ec.Location,
    ec.PaymentMethod,
    ec.Status,
    ec.SubmittedAt,
    ec.CreatedAt,
    ec.UpdatedAt,
    ec.CreatedBy,
    ec.UpdatedBy
FROM ExpenseClaims ec
INNER JOIN Users u
    ON u.UserId = ec.EmployeeId
INNER JOIN Departments d
    ON d.DepartmentId = ec.DepartmentId
LEFT JOIN Projects p
    ON p.ProjectId = ec.ProjectId
WHERE
    (@EmployeeId IS NULL OR ec.EmployeeId = @EmployeeId)
    AND (@Status IS NULL OR ec.Status = @Status)
    AND (@DepartmentId IS NULL OR ec.DepartmentId = @DepartmentId)
ORDER BY ec.CreatedAt DESC;
`;

const getClaimById = `
SELECT
    ec.ExpenseClaimId,
    ec.ClaimNumber,
    ec.EmployeeId,
    u.FullName AS EmployeeName,
    u.Email AS EmployeeEmail,
    ec.DepartmentId,
    d.DepartmentName,
    ec.ProjectId,
    p.ProjectName,
    p.ClientName,
    p.CostCenter,
    ec.ClaimDate,
    ec.TotalAmount,
    ec.Currency,
    ec.BusinessPurpose,
    ec.Location,
    ec.PaymentMethod,
    ec.Remarks,
    ec.Status,
    ec.SubmittedAt,
    ec.CreatedAt,
    ec.UpdatedAt,
    ec.CreatedBy,
    ec.UpdatedBy
FROM ExpenseClaims ec
INNER JOIN Users u
    ON u.UserId = ec.EmployeeId
INNER JOIN Departments d
    ON d.DepartmentId = ec.DepartmentId
LEFT JOIN Projects p
    ON p.ProjectId = ec.ProjectId
WHERE ec.ExpenseClaimId = @ExpenseClaimId;
`;

const getItemsByClaimId = `
SELECT
    ei.ExpenseItemId,
    ei.ExpenseClaimId,
    ei.CategoryId,
    ec.CategoryName,
    ei.ExpenseDate,
    ei.Amount,
    ei.Currency,
    ei.MerchantName,
    ei.Description,
    ei.BusinessPurpose,
    ei.PaymentMethod,
    ei.IsPolicyException,
    ei.PolicyExceptionReason,
    ei.CreatedAt,
    ei.UpdatedAt,
    ei.CreatedBy,
    ei.UpdatedBy
FROM ExpenseItems ei
INNER JOIN ExpenseCategories ec
    ON ec.CategoryId = ei.CategoryId
WHERE ei.ExpenseClaimId = @ExpenseClaimId
ORDER BY ei.ExpenseDate;
`;

const getReceiptsByClaimId = `
SELECT
    ReceiptId,
    ExpenseClaimId,
    ExpenseItemId,
    FileName,
    FilePath,
    FileType,
    FileSize,
    UploadedBy,
    UploadedAt,
    CreatedAt,
    UpdatedAt,
    CreatedBy,
    UpdatedBy
FROM ExpenseReceipts
WHERE ExpenseClaimId = @ExpenseClaimId
ORDER BY CreatedAt DESC;
`;

const getPolicyByCategory = `
SELECT TOP 1
    PolicyRuleId,
    CategoryId,
    PolicyName,
    MaximumAmount,
    LimitType,
    Currency,
    IsReceiptRequired
FROM PolicyRules
WHERE
    CategoryId = @CategoryId
    AND IsActive = 1
ORDER BY PolicyRuleId DESC;
`;

const updateClaim = `
UPDATE ExpenseClaims
SET
    BusinessPurpose = @BusinessPurpose,
    Location = @Location,
    PaymentMethod = @PaymentMethod,
    Remarks = @Remarks,
    UpdatedAt = GETDATE(),
    UpdatedBy = @UpdatedBy
WHERE ExpenseClaimId = @ExpenseClaimId;
`;

const deleteItems = `
DELETE FROM ExpenseItems
WHERE ExpenseClaimId = @ExpenseClaimId;
`;

const softDeleteClaim = `
UPDATE ExpenseClaims
SET
    Status = 'Deleted',
    UpdatedAt = GETDATE(),
    UpdatedBy = @UpdatedBy
WHERE ExpenseClaimId = @ExpenseClaimId;
`;

const submitClaim = `
UPDATE ExpenseClaims
SET
    Status = @Status,
    SubmittedAt = GETDATE(),
    UpdatedAt = GETDATE(),
    UpdatedBy = @UpdatedBy
WHERE ExpenseClaimId = @ExpenseClaimId;
`;

const updateClaimStatus = `
UPDATE ExpenseClaims
SET
    Status = @Status,
    UpdatedAt = GETDATE(),
    UpdatedBy = @UpdatedBy
WHERE ExpenseClaimId = @ExpenseClaimId;
`;

const insertApprovalHistory = `
INSERT INTO ApprovalHistory
(
    ExpenseClaimId,
    ApprovalLevel,
    ApproverId,
    Action,
    Comments,
    ActionDate,
    PreviousStatus,
    NewStatus,
    CreatedAt,
    CreatedBy
)
VALUES
(
    @ExpenseClaimId,
    @ApprovalLevel,
    @ApproverId,
    @Action,
    @Comments,
    GETDATE(),
    @PreviousStatus,
    @NewStatus,
    GETDATE(),
    @CreatedBy
);
`;

const getPendingApprovals = `
SELECT
    ec.ExpenseClaimId,
    ec.ClaimNumber,
    ec.EmployeeId,
    employee.FullName AS EmployeeName,
    ec.DepartmentId,
    d.DepartmentName,
    ec.TotalAmount,
    ec.Currency,
    ec.BusinessPurpose,
    ec.Status,
    ec.SubmittedAt,
    ah.ApprovalLevel,
    ah.ActionDate AS LastApprovalDate
FROM ExpenseClaims ec
INNER JOIN Users employee
    ON employee.UserId = ec.EmployeeId
INNER JOIN Departments d
    ON d.DepartmentId = ec.DepartmentId
OUTER APPLY
(
    SELECT TOP 1
        ApprovalLevel,
        ActionDate
    FROM ApprovalHistory
    WHERE ExpenseClaimId = ec.ExpenseClaimId
    ORDER BY ApprovalHistoryId DESC
) ah
WHERE ec.Status IN
(
    'Submitted',
    'Manager Approved',
    'Department Head Review',
    'Finance Review',
    'Finance Head Review'
)
AND
(
    @UserId IS NULL
    OR EXISTS
    (
        SELECT 1
        FROM Users approver
        WHERE approver.UserId = @UserId
          AND
          (
              (ec.Status = 'Submitted' AND approver.Role = 'Manager')
              OR
              (ec.Status = 'Department Head Review' AND approver.Role = 'DepartmentHead')
              OR
              (ec.Status = 'Finance Review' AND approver.Role = 'Finance')
              OR
              (ec.Status = 'Finance Head Review' AND approver.Role = 'FinanceHead')
          )
    )
)
ORDER BY ec.SubmittedAt;
`;

const getNextApprovalRule = `
SELECT TOP 1
    ApprovalRuleId,
    MinimumAmount,
    MaximumAmount,
    ApprovalLevel,
    ApproverRole,
    SequenceNo
FROM ApprovalRules
WHERE
    IsActive = 1
    AND @Amount >= MinimumAmount
    AND (@Amount <= MaximumAmount OR MaximumAmount IS NULL)
    AND SequenceNo = @SequenceNo
ORDER BY ApprovalRuleId;
`;

const getApprovalHistory = `
SELECT
    ah.ApprovalHistoryId,
    ah.ExpenseClaimId,
    ah.ApprovalLevel,
    ah.ApproverId,
    u.FullName AS ApproverName,
    u.Role AS ApproverRole,
    ah.Action,
    ah.Comments,
    ah.ActionDate,
    ah.PreviousStatus,
    ah.NewStatus,
    ah.CreatedAt,
    ah.UpdatedAt,
    ah.CreatedBy,
    ah.UpdatedBy
FROM ApprovalHistory ah
INNER JOIN Users u
    ON u.UserId = ah.ApproverId
WHERE ah.ExpenseClaimId = @ExpenseClaimId
ORDER BY ah.ActionDate ASC;
`;

const insertAuditLog = `
INSERT INTO AuditLogs
(
    UserId,
    ExpenseClaimId,
    Action,
    PreviousStatus,
    NewStatus,
    Comments,
    CreatedAt,
    CreatedBy
)
VALUES
(
    @UserId,
    @ExpenseClaimId,
    @Action,
    @PreviousStatus,
    @NewStatus,
    @Comments,
    GETDATE(),
    @UserId
);
`;

const insertReimbursement = `
INSERT INTO Reimbursements
(
    ExpenseClaimId,
    PaymentReference,
    PaymentDate,
    PaymentAmount,
    PaymentMethod,
    TransactionReference,
    PaymentRemarks,
    ProcessedBy,
    Status,
    CreatedAt,
    CreatedBy
)
VALUES
(
    @ExpenseClaimId,
    @PaymentReference,
    @PaymentDate,
    @PaymentAmount,
    @PaymentMethod,
    @TransactionReference,
    @PaymentRemarks,
    @ProcessedBy,
    @Status,
    GETDATE(),
    @CreatedBy
);
`;

const getReimbursementByClaimId = `
SELECT
    ReimbursementId,
    ExpenseClaimId,
    PaymentReference,
    PaymentDate,
    PaymentAmount,
    PaymentMethod,
    TransactionReference,
    PaymentRemarks,
    ProcessedBy,
    Status,
    CreatedAt,
    UpdatedAt,
    CreatedBy,
    UpdatedBy
FROM Reimbursements
WHERE ExpenseClaimId = @ExpenseClaimId;
`;

const expenseReport = `
SELECT
    ec.ExpenseClaimId,
    ec.ClaimNumber,
    ec.ClaimDate,
    u.EmployeeCode,
    u.FullName AS EmployeeName,
    d.DepartmentName,
    p.ProjectName,
    p.ClientName,
    p.CostCenter,
    ec.TotalAmount,
    ec.Currency,
    ec.Status
FROM ExpenseClaims ec
INNER JOIN Users u
    ON u.UserId = ec.EmployeeId
INNER JOIN Departments d
    ON d.DepartmentId = ec.DepartmentId
LEFT JOIN Projects p
    ON p.ProjectId = ec.ProjectId
WHERE
    (@FromDate IS NULL OR ec.ClaimDate >= @FromDate)
    AND (@ToDate IS NULL OR ec.ClaimDate <= @ToDate)
    AND (@DepartmentId IS NULL OR ec.DepartmentId = @DepartmentId)
    AND (@EmployeeId IS NULL OR ec.EmployeeId = @EmployeeId)
ORDER BY ec.ClaimDate DESC;
`;

module.exports = {
  insertClaim,
  insertExpenseItem,
  recalculateClaimTotal,
  getClaims,
  getClaimById,
  getItemsByClaimId,
  getReceiptsByClaimId,
  getPolicyByCategory,
  updateClaim,
  deleteItems,
  softDeleteClaim,
  submitClaim,
  updateClaimStatus,
  insertApprovalHistory,
  getPendingApprovals,
  getNextApprovalRule,
  getApprovalHistory,
  insertAuditLog,
  insertReimbursement,
  getReimbursementByClaimId,
  expenseReport,
  getReceiptsByClaimId
};
