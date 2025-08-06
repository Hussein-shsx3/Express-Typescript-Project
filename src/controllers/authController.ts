import { Request, Response } from "express";
import UserModel from "../models/user.model";
import RefreshTokenModel from "../models/refreshToken.model";

import { asyncHandler } from "../middlewares/errorMiddleware";
import { AppError } from "../middlewares/errorMiddleware";

import { RegisterUserDto, LoginUserDto } from "../dtos/auth.dto";
import {
  generateAccessToken,
  generateVerificationToken,
  generateRefreshToken,
} from "../utils/generateToken";
import { forgotPasswordTemplate } from "../utils/emailTemplates/forgotPasswordTemplate";
import { emailVerificationTemplate } from "../utils/emailTemplates/emailVerificationTemplate";
import sendEmail from "../utils/sendEmail";

// ====================
// REGISTER USER
// ====================
export const registerUser = asyncHandler(
  async (req: Request<{}, {}, RegisterUserDto>, res: Response) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError("Name, email, and password are required", 400);
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      throw new AppError("User already exists with this email", 400);
    }

    const user = await UserModel.create({
      name,
      email,
      password,
      isVerified: false,
    });

    const { token, expires } = generateVerificationToken();

    user.verificationToken = token;
    user.verificationTokenExpires = expires;
    await user.save();

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const emailHtml = emailVerificationTemplate({
      name,
      verifyUrl,
    });

    await sendEmail({
      to: email,
      subject: "Verify Your Email",
      html: emailHtml,
    });

    res.status(201).json({
      success: true,
      message:
        "User registered successfully. Please check your email to verify your account.",
    });
  }
);

// ====================
// LOGIN USER
// ====================
export const loginUser = asyncHandler(
  async (req: Request<{}, {}, LoginUserDto>, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const user = await UserModel.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError("Invalid email or password", 401);
    }

    if (!user.isVerified) {
      throw new AppError(
        "Your account is not verified. Please check your email.",
        403
      );
    }

    const accessToken = generateAccessToken(user._id.toString(), user.role);

    const { token: refreshToken, expiresAt } = generateRefreshToken();

    await RefreshTokenModel.create({
      user: user._id,
      token: refreshToken,
      expiresAt,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      data: {
        accessToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          picture: user.picture,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  }
);

// ====================
// REFRESH ACCESS TOKEN
// ====================
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const receivedToken = req.cookies.refreshToken;

    if (!receivedToken) {
      throw new AppError("Refresh token missing", 401);
    }

    const storedToken = await RefreshTokenModel.findOne({
      token: receivedToken,
    });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    const user = await UserModel.findById(storedToken.user);
    if (!user) {
      throw new AppError("User not found", 401);
    }

    const accessToken = generateAccessToken(user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      accessToken,
    });
  }
);

// ====================
// LOGOUT USER
// ====================
export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  const receivedToken = req.cookies.refreshToken;

  if (receivedToken) {
    await RefreshTokenModel.deleteOne({ token: receivedToken });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  }

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// ====================
// FORGOT PASSWORD - SEND RESET EMAIL
// ====================
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Please provide your email address", 400);
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new AppError("No user found with this email", 404);
    }

    const { token: resetToken, expires } = generateVerificationToken();

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = expires;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = forgotPasswordTemplate({
      name: user.name,
      resetUrl,
    });

    // Send email
    await sendEmail({
      to: user.email,
      subject: "Reset Your Password",
      html,
    });

    res.status(200).json({
      success: true,
      message: "Reset link has been sent to your email.",
    });
  }
);

// ====================
// RESET PASSWORD - UPDATE PASSWORD
// ====================
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      throw new AppError(
        "Token, new password, and confirm password are required",
        400
      );
    }

    if (newPassword !== confirmPassword) {
      throw new AppError("Passwords do not match", 400);
    }

    if (newPassword.length < 8) {
      throw new AppError("Password must be at least 8 characters long", 400);
    }

    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    user.password = newPassword;

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Password has been reset successfully. Please log in with your new password.",
    });
  }
);

// ====================
// VERIFY EMAIL USING TOKEN
// ====================
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    throw new AppError("Verification token is missing or invalid", 400);
  }

  const user = await UserModel.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError("Invalid or expired verification token", 400);
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Email verified successfully. You can now log in.",
  });
});

// ====================
// RESEND EMAIL VERIFICATION
// ====================
export const resendVerification = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) throw new AppError("Email is required", 400);

    const user = await UserModel.findOne({ email });
    if (!user) throw new AppError("User not found", 404);

    if (user.isVerified) {
      throw new AppError("User already verified", 400);
    }

    const { token, expires } = generateVerificationToken();
    user.verificationToken = token;
    user.verificationTokenExpires = expires;
    await user.save();

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const html = emailVerificationTemplate({
      name: user.name,
      verifyUrl,
    });

    await sendEmail({
      to: user.email,
      subject: "Resend Email Verification",
      html,
    });

    res.status(200).json({
      success: true,
      message: "Verification email resent. Please check your inbox.",
    });
  }
);
