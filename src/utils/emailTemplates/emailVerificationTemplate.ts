export const emailVerificationTemplate = ({
  name,
  verifyUrl,
}: {
  name: string;
  verifyUrl: string;
}) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Hello ${name},</h2>
    <p>Thanks for registering! Please verify your email by clicking the button below:</p>
    <a href="${verifyUrl}" 
      style="background: #007BFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
      Verify Email
    </a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn’t request this, you can safely ignore this email.</p>
    <br/>
    <p>Best Regards,</p>
    <p><strong>Your App Team</strong></p>
  </div>
`;
