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

  console.log('Email sent successfully:', info.messageId);
};