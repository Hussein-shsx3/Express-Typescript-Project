import crypto from "crypto";

export const generateVerificationToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
  return { token, expires };
};
