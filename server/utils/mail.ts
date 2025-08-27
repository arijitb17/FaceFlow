import nodemailer from "nodemailer";

export async function sendInviteEmail(to: string, subject: string, html: string) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER or EMAIL_PASS environment variable is missing");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Admin" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}
