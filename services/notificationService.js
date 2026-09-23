const { ExpenseClaim, User } = require('../models');
const { sendMail } = require('../utils/mailer');

async function getClaimWithEmployee(expenseClaimId) {
  return ExpenseClaim.findByPk(expenseClaimId, {
    include: [{ model: User, as: 'Employee' }]
  });
}

async function notifySubmitted(expenseClaimId) {
  const claim = await getClaimWithEmployee(expenseClaimId);
  if (!claim) return;

  await sendMail({
    to: claim.Employee.Email,
    subject: `Expense Claim ${claim.ClaimNumber} Submitted`,
    html: `<p>Hi ${claim.Employee.FullName},</p>
      <p>Your expense claim <b>${claim.ClaimNumber}</b> for amount ${claim.TotalAmount} has been submitted for approval.</p>`
  });
}

async function notifyApproved(expenseClaimId, comments, nextStageRole) {
  const claim = await getClaimWithEmployee(expenseClaimId);
  if (!claim) return;

  const progressMessage = nextStageRole
    ? `Your expense claim <b>${claim.ClaimNumber}</b> has been approved and is now awaiting review by ${nextStageRole}.`
    : `Your expense claim <b>${claim.ClaimNumber}</b> has been fully approved.`;

  await sendMail({
    to: claim.Employee.Email,
    subject: `Expense Claim ${claim.ClaimNumber} Approved`,
    html: `<p>Hi ${claim.Employee.FullName},</p>
      <p>${progressMessage}</p>
      ${comments ? `<p>Comments: ${comments}</p>` : ''}`
  });
}

async function notifyRejected(expenseClaimId, comments) {
  const claim = await getClaimWithEmployee(expenseClaimId);
  if (!claim) return;

  await sendMail({
    to: claim.Employee.Email,
    subject: `Expense Claim ${claim.ClaimNumber} Rejected`,
    html: `<p>Hi ${claim.Employee.FullName},</p>
      <p>Your expense claim <b>${claim.ClaimNumber}</b> has been rejected.</p>
      <p>Comments: ${comments}</p>`
  });
}

async function notifySentBack(expenseClaimId, comments) {
  const claim = await getClaimWithEmployee(expenseClaimId);
  if (!claim) return;

  await sendMail({
    to: claim.Employee.Email,
    subject: `Expense Claim ${claim.ClaimNumber} Sent Back`,
    html: `<p>Hi ${claim.Employee.FullName},</p>
      <p>Your expense claim <b>${claim.ClaimNumber}</b> has been sent back for changes.</p>
      <p>Comments: ${comments}</p>`
  });
}

async function notifyPendingApproval(expenseClaimId, role, departmentId) {
  const claim = await getClaimWithEmployee(expenseClaimId);
  if (!claim) return;

  const where = { Role: role, IsActive: true };
  if (departmentId) where.DepartmentId = departmentId;

  const approvers = await User.findAll({ where });
  if (!approvers.length) return;

  const subject = `Expense Claim ${claim.ClaimNumber} Awaiting Your Approval`;
  const html = `<p>Hi,</p>
    <p>Expense claim <b>${claim.ClaimNumber}</b> from ${claim.Employee.FullName} for amount ${claim.TotalAmount} is awaiting your approval.</p>`;

  await Promise.all(approvers.map((user) => sendMail({ to: user.Email, subject, html })));
}

async function notifyPendingApprovalForManager(expenseClaimId, managerUserId) {
  const claim = await getClaimWithEmployee(expenseClaimId);
  if (!claim) return;

  const manager = await User.findByPk(managerUserId);
  if (!manager) return;

  await sendMail({
    to: manager.Email,
    subject: `Expense Claim ${claim.ClaimNumber} Awaiting Your Approval`,
    html: `<p>Hi ${manager.FullName},</p>
      <p>Expense claim <b>${claim.ClaimNumber}</b> from ${claim.Employee.FullName} for amount ${claim.TotalAmount} is awaiting your approval as their manager.</p>`
  });
}

async function notifyReimbursed(expenseClaimId, paymentAmount) {
  const claim = await getClaimWithEmployee(expenseClaimId);
  if (!claim) return;

  await sendMail({
    to: claim.Employee.Email,
    subject: `Expense Claim ${claim.ClaimNumber} Reimbursed`,
    html: `<p>Hi ${claim.Employee.FullName},</p>
      <p>An amount of ${paymentAmount} has been reimbursed for your expense claim <b>${claim.ClaimNumber}</b>.</p>`
  });
}

module.exports = {
  notifySubmitted,
  notifyApproved,
  notifyRejected,
  notifySentBack,
  notifyPendingApproval,
  notifyPendingApprovalForManager,
  notifyReimbursed
};
