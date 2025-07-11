import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import UserModel, { UserDocument } from "../models/user.model";
import { AppError, asyncHandler } from "./errorMiddleware";

declare module "express-serve-static-core" {
  interface Request {
    user?: UserDocument;
  }
}

export const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      throw new AppError("Not authorized, token missing", 401);
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET as string
    ) as { userId: string };

    const user = await UserModel.findById(decoded.userId).select("-password");
    if (!user) {
      throw new AppError("User not found", 401);
    }

    req.user = user;

    next();
  }
);
