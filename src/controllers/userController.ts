import { Request, Response } from "express";
import UserModel from "../models/user.model";
import { asyncHandler, AppError } from "../middlewares/errorMiddleware";
import cloudinary from "../config/cloudinary";
import { getAll, getOne, deleteOne } from "./handlerFactory";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("User not authenticated", 401);
  }

  res.status(200).json({
    success: true,
    data: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      picture: req.user.picture,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    },
  });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("User not authenticated", 401);
  }

  const userId = req.user!._id;
  const { name, email } = req.body;

  if (!name && !email) {
    throw new AppError("Please provide name or email to update", 400);
  }

  const updateData: Partial<{ name: string; email: string }> = {}; //? Partial is a TypeScript utility type that makes all properties of type T optional. means an object that may have name, or email, or both, or even neither.
  if (name) updateData.name = name;
  if (email) updateData.email = email;

  const updatedUser = await UserModel.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
    select: "-password",
  });

  if (!updatedUser) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: updatedUser,
  });
});

export const deleteMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("User not authenticated", 401);
  }

  const user = await UserModel.findByIdAndDelete(req.user._id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({
    success: true,
    message: "Your account has been deleted successfully",
  });
});

export const updateProfilePicture = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    if (!req.file) {
      throw new AppError("No image file uploaded", 400);
    }

    const result = await new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "users",
          public_id: `user-${req.user!._id}-${Date.now()}`,
          transformation: [{ width: 500, crop: "limit" }],
        },
        (error, result) => {
          if (error || !result) {
            return reject(new AppError("Image upload failed", 500));
          }
          resolve(result.secure_url);
        }
      );

      uploadStream.end(req.file!.buffer);
    });

    req.user.picture = result;
    await req.user.save();

    res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: {
        picture: req.user.picture,
      },
    });
  }
);

export const updateUserById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const { name, email, role } = req.body;

    // Build update object dynamically
    const updateData: Partial<{ name: string; email: string; role: string }> =
      {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;

    const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -picture");

    if (!updatedUser) {
      throw new AppError("User not found", 404);
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  }
);

export const getAllUsers = getAll(UserModel);
export const getUserById = getOne(UserModel);
export const deleteUserById = deleteOne(UserModel);
