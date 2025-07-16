import { Request, Response } from "express";
import UserModel from "../models/user.model";
import { asyncHandler, AppError } from "../middlewares/errorMiddleware";
import cloudinary from "../config/cloudinary";
import { getAll, getOne, deleteOne } from "../shared/handlerFactory";

// ====================
// GET CURRENT AUTHENTICATED USER PROFILE
// ====================
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

// ====================
// UPDATE CURRENT AUTHENTICATED USER PROFILE (NAME/EMAIL)
// ====================
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

// ====================
// CHANGE PASSWORD FOR AUTHENTICATED USER
// ====================
export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new AppError("Old and new passwords are required", 400);
    }

    const user = await UserModel.findById(req.user._id);

    if (!user || !(await user.comparePassword(oldPassword))) {
      throw new AppError("Your current password is incorrect", 400);
    }

    if (oldPassword === newPassword) {
      throw new AppError(
        "New password must be different from the old password",
        400
      );
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Your password has been changed successfully",
    });
  }
);

// ====================
// DELETE CURRENT AUTHENTICATED USER ACCOUNT
// ====================
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

// ====================
// UPDATE PROFILE PICTURE FOR AUTHENTICATED USER
// ====================
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

// ====================
// UPDATE USER BY ADMIN (NAME/EMAIL/ROLE)
// ====================
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

// ====================
// ADMIN: GET ALL USERS
// ====================
export const getAllUsers = getAll(UserModel);

// ====================
// ADMIN: GET USER BY ID
// ====================
export const getUserById = getOne(UserModel);

// ====================
// ADMIN: DELETE USER BY ID
// ====================
export const deleteUserById = deleteOne(UserModel);
