import { Request, Response } from "express";
import UserModel from "../models/user.model";
import RefreshTokenModel from "../models/refreshToken.model";

import { asyncHandler } from "../middlewares/errorMiddleware";
import { AppError } from "../middlewares/errorMiddleware";

import { RegisterUserDto, LoginUserDto } from "../dtos/auth.dto";
import { generateAccessToken } from "../utils/generateToken";
import { forgotPasswordTemplate } from "../utils/forgotPasswordTemplate";
import { emailVerificationTemplate } from "../utils/emailVerificationTemplate";
import { generateVerificationToken } from "../utils/generateVerificationToken";
import sendEmail from "../utils/sendEmail";

import jwt from "jsonwebtoken";
import crypto from "crypto";

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

    const accessToken = generateAccessToken(user._id.toString());

    const refreshToken = crypto.randomBytes(40).toString("hex");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshTokenModel.create({
      user: user._id,
      token: refreshToken,
      expiresAt,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

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

    const accessToken = generateAccessToken(user._id.toString());

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
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError("Please provide your email address", 400);
  }

  const user = await UserModel.findOne({ email });

  if (!user) {
    throw new AppError("No user found with this email", 404);
  }

  const resetToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: "15m" }
  );

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = forgotPasswordTemplate({ name: user.name, resetUrl });

  await sendEmail({
    to: user.email,
    subject: "Reset Your Password",
    html,
  });

  res.status(200).json({
    success: true,
    message: "Reset link has been sent to your email.",
  });
});

// ====================
// RESET PASSWORD - UPDATE PASSWORD
// ====================
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new AppError("Token and new password are required", 400);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as {
        userId: string;
      };
    } catch (err) {
      throw new AppError("Invalid or expired token", 401);
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
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
