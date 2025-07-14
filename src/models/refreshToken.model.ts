import mongoose, { Schema } from "mongoose";
import { RefreshTokenDocument } from "types/refreshToken.types";

const refreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const RefreshTokenModel = mongoose.model<RefreshTokenDocument>(
  "RefreshToken",
  refreshTokenSchema
);

export default RefreshTokenModel;
