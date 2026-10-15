// Sends email via Gmail SMTP using Nodemailer — completely free, no domain
// verification needed, and can send to any recipient immediately (unlike
// Resend's free tier, which can only send to the account owner's own email
// until a domain is verified with DNS access).
//
// Setup: one Gmail account, one "App Password" (not your normal Gmail
// password — see README for the exact steps). Free tier sends ~500/day,
// far more than a class project needs.

import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendReminderEmail(to: string, subject: string, body: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD not set in .env.local — see README for setup.");
  }

  await getTransporter().sendMail({
    from: `"CampusConnect" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text: body,
  });
}
