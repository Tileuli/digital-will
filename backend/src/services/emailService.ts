import nodemailer from 'nodemailer';

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log('SMTP config check:', {
    host,
    port,
    userExists: !!user,
    passExists: !!pass,
  });

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

export const sendCheckinReminderEmail = async (
  to: string,
  ownerName: string,
  nextCheckinDue: Date
) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.warn(`SMTP is not configured. Reminder email for ${to} was skipped.`);
    return;
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Digital Will: Please confirm you are okay',
    text: `
Hello ${ownerName},

This is a reminder from the Digital Will service.

Your next check-in is due at:
${nextCheckinDue.toISOString()}

Please log in to the application and confirm that you are okay.

If you do not check in before the deadline, the system may start the conditional release process.

Digital Will Service
    `.trim(),
  });

  console.log('Reminder email sent successfully:', info.messageId);
};

export const sendReleaseEmail = async (
  to: string,
  recipientName: string,
  ownerName: string,
  encryptedData: string
) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.warn(`SMTP is not configured. Release email for ${to} was skipped.`);
    return;
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Digital Will: Access Released',
    text: `
Hello ${recipientName},

You are receiving this message because ${ownerName} added you as a trusted recipient in the Digital Will service.

The vault release condition has been triggered.

Encrypted vault data:
${encryptedData}

Please keep this information private.

Digital Will Service
    `.trim(),
  });

  console.log('Release email sent successfully:', info.messageId);
};