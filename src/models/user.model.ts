import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { UserDocument } from "../types/user.types";

const userSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
    },
    picture: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: { type: String, default: null, index: true },
    verificationTokenExpires: { type: Date, default: null },
    resetPasswordToken: { type: String, default: null, index: true },
    resetPasswordExpires: { type: Date, default: null },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare Password Method
userSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

const UserModel = mongoose.model<UserDocument>("User", userSchema);
export default UserModel;
