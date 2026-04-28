import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromAddress = () =>
  process.env.RESEND_FROM ||
  process.env.SMTP_FROM ||
  'Digital Will <onboarding@resend.dev>';

const createSmtpTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

/**
 * Single send path used by every helper below.
 * Prefers Resend (HTTPS API — works on Railway/Vercel/Render where outbound
 * SMTP is often blocked). Falls back to nodemailer if only SMTP is configured.
 * If neither is configured we log a warning so dev flows that don't need real
 * email (e.g. local registration with the code printed to console) still work.
 */
const sendMail = async (
  to: string,
  subject: string,
  text: string,
  fallbackContext?: string
): Promise<void> => {
  if (resend) {
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to,
      subject,
      text,
    });
    if (error) {
      console.error(`Resend send failed for ${to}:`, error);
      throw new Error(error.message || 'Resend send failed');
    }
    return;
  }

  const smtp = createSmtpTransporter();
  if (smtp) {
    await smtp.sendMail({ from: fromAddress(), to, subject, text });
    return;
  }

  console.warn(
    `No email provider configured. Skipping mail to ${to}. ${fallbackContext || ''}`
  );
};

const frontendBase = () =>
  (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

export const sendCheckinReminderEmail = async (
  to: string,
  ownerName: string,
  nextCheckinDue: Date
) => {
  await sendMail(
    to,
    'Digital Will: Please confirm you are okay',
    `Hello ${ownerName},

This is a reminder from the Digital Will service.

Your next check-in is due at:
${nextCheckinDue.toISOString()}

Please log in and confirm that you are okay. If you miss the deadline, the conditional release will begin.

Digital Will Service`
  );
};

export const sendRecipientInvitationEmail = async (
  to: string,
  recipientName: string,
  ownerName: string,
  token: string
) => {
  const link = `${frontendBase()}/recipient/setup?token=${encodeURIComponent(token)}`;
  await sendMail(
    to,
    'Digital Will: You have been added as a trusted recipient',
    `Hello ${recipientName},

${ownerName} has added you as a trusted recipient in the Digital Will service.

To accept this role and enable end-to-end encrypted access, please set up your recipient keypair by visiting the following link and choosing a private passphrase. The passphrase never leaves your browser and cannot be recovered — write it down somewhere safe.

${link}

This invitation link is valid for 30 days.

Digital Will Service`,
    `Link: ${link}`
  );
};

export const sendConfirmerInvitationEmail = async (
  to: string,
  confirmerName: string,
  ownerName: string,
  token: string
) => {
  const link = `${frontendBase()}/confirmer/accept?token=${encodeURIComponent(token)}`;
  await sendMail(
    to,
    'Digital Will: You have been added as a trusted contact',
    `Hello ${confirmerName},

${ownerName} has added you as a trusted contact in their Digital Will. If they ever
become unreachable, we may ask you to confirm whether they have passed away. Your
confirmation, combined with others, releases their encrypted instructions to the
people they chose.

To accept this role, please open:

${link}

You will not see any of their data — only a yes/no question if confirmation is
ever requested. You can decline by ignoring this message.

Digital Will Service`,
    `Link: ${link}`
  );
};

export const sendDeathVoteEmail = async (
  to: string,
  confirmerName: string,
  ownerName: string,
  token: string
) => {
  const link = `${frontendBase()}/confirmer/vote?token=${encodeURIComponent(token)}`;
  await sendMail(
    to,
    `Digital Will: Confirmation requested for ${ownerName}`,
    `Hello ${confirmerName},

${ownerName} has missed multiple check-ins on Digital Will. As one of their trusted
contacts, we are asking you to confirm whether they have passed away or are
otherwise unable to respond.

Please answer here:

${link}

If a sufficient number of trusted contacts confirm, ${ownerName}'s prepared
instructions will be released to the recipients they chose. If they later check
in themselves, this request is cancelled and the votes discarded.

Digital Will Service`,
    `Link: ${link}`
  );
};

export const sendRegistrationCodeEmail = async (to: string, code: string) => {
  await sendMail(
    to,
    `Your Digital Will verification code: ${code}`,
    `Hello,

Your Digital Will verification code is:

  ${code}

This code expires in 10 minutes. If you did not request it, you can safely ignore this email — no account will be created.

Digital Will Service`,
    `Code: ${code}`
  );
};

export const sendReleaseEmail = async (
  to: string,
  recipientName: string,
  ownerName: string,
  token: string
) => {
  const link = `${frontendBase()}/recipient/claim?token=${encodeURIComponent(token)}`;
  await sendMail(
    to,
    'Digital Will: Access Released',
    `Hello ${recipientName},

The Digital Will release condition for ${ownerName} has been triggered. Their trusted instructions are now available to you.

To view the encrypted contents, please visit the following secure link and enter the passphrase you chose when you first accepted the invitation. Decryption happens entirely inside your browser — the server never sees the plaintext.

${link}

This link is valid for 30 days and can be used multiple times.

Digital Will Service`,
    `Link: ${link}`
  );
};
