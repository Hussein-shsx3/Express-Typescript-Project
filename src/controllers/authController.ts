import { Request, Response } from "express";
import UserModel from "../models/user.model";
import { asyncHandler } from "../middlewares/errorMiddleware";
import { AppError } from "../middlewares/errorMiddleware";
import jwt from "jsonwebtoken";
import { RegisterUserDto, LoginUserDto } from "../dtos/auth.dto";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken";

// Register Controller
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
    });

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      picture: user.picture,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(201).json({
      success: true,
      data: userResponse,
      message:
        "User registered successfully. Please login to get your access token.",
    });
  }
);

//   Login Controller
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

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

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

// refreshToken Controller
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError("Refresh token missing", 401);
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string
    ) as { userId: string };

    const user = await UserModel.findById(decoded.userId);
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

// Logout Controller
export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});
