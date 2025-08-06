import jwt from "jsonwebtoken";
import crypto from "crypto";

export const generateAccessToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, process.env.JWT_ACCESS_SECRET as string, {
    expiresIn: "5m", // 5 minutes
  });
};

export const generateRefreshToken = () => {
  const token = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  return { token, expiresAt };
};

export const generateVerificationToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
  return { token, expires };
};
