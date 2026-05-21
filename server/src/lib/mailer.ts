import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter: nodemailer.Transporter;
let usingTestAccount = false;

async function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Create ethereal account for dev testing when no SMTP configured
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    usingTestAccount = true;
  }
}

export async function sendVerificationEmail(to: string, code: string) {
  if (!transporter) await createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    to,
    subject: 'Your verification code',
    text: `Your verification code is ${code}. It will expire in 15 minutes.`,
    html: `<p>Your verification code is <b>${code}</b>. It will expire in 15 minutes.</p>`,
  };

  const info = await transporter.sendMail(mailOptions);

  // If using ethereal, return the preview URL so developer can view the message
  let previewUrl: string | undefined;
  if (usingTestAccount) {
    // @ts-ignore
    previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
  }

  return { info, previewUrl };
}

export default { sendVerificationEmail };
