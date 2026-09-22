const nodemailer = require('nodemailer');

let transporterPromise;

function buildTransporter() {
  const provider = (process.env.MAIL_PROVIDER || 'ethereal').toLowerCase();

  if (provider === 'smtp') {
    return Promise.resolve(nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }));
  }

  if (provider === 'ethereal') {
    return nodemailer.createTestAccount().then((account) => {
      console.log(`Ethereal test inbox ready. Login at https://ethereal.email with user: ${account.user}`);

      return nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass }
      });
    });
  }

  throw new Error(`Unsupported MAIL_PROVIDER: ${provider}`);
}

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = buildTransporter();
  }

  return transporterPromise;
}

async function sendMail({ to, subject, html }) {
  if (!to) return;

  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'Expense Reimbursement <no-reply@example.com>',
      to,
      subject,
      html
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Email queued for ${to}. Preview: ${previewUrl}`);
    }
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
  }
}

module.exports = { sendMail };
