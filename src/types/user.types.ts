import { Document, Types } from "mongoose";

export type UserRole = "user" | "admin";

export interface IUser {
  name: string;
  email: string;
  password: string;
  picture?: string;
  role: UserRole;

  isVerified: boolean;
  verificationToken?: string | null;
  verificationTokenExpires?: Date | null;

  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;

  lastLoginAt?: Date;
  lastLoginIp?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

// Extended Mongoose document with instance method
export interface UserDocument extends Omit<IUser, "_id">, Document {
  _id: Types.ObjectId;
  comparePassword(enteredPassword: string): Promise<boolean>;
}
