import nodemailer from "nodemailer";
import { SendEmailOptions } from "../types/sendEmail.type";

const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER as string,
      pass: process.env.SMTP_PASS as string,
    },
  });

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

export default sendEmail;
