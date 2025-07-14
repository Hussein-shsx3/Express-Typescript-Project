export const forgotPasswordTemplate = (
  name: string,
  resetUrl: string
): string => `
  <h2>Password Reset Request</h2>
  <p>Hello ${name},</p>
  <p>You requested to reset your password. Please click the link below to proceed:</p>
  <a href="${resetUrl}" target="_blank">Reset Your Password</a>
  <p>This link will expire in 15 minutes.</p>
  <p>If you didn't request this, please ignore this email.</p>
`;
