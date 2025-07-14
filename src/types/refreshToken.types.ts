import { Document, Types } from "mongoose";

export interface RefreshTokenDocument extends Document {
  user: Types.ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}
