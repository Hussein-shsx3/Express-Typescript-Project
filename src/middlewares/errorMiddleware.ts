import { Request, Response, NextFunction } from "express";

// Custom error class with optional code
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 Not Found handler middleware
export const notFound = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

// Centralized error handler middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error (consider replacing with Winston or Pino in production)
  console.error(`Error: ${err.message}`);

  // Handle known Mongoose errors
  if (err.name === "CastError") {
    error = new AppError("Resource not found", 404, "CAST_ERROR");
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value entered for '${field}'`;
    error = new AppError(message, 400, "DUPLICATE_FIELD");
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors)
      .map((val: any) => val.message)
      .join(", ");
    error = new AppError(messages, 400, "VALIDATION_ERROR");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid token", 401, "JWT_INVALID");
  }

  if (err.name === "TokenExpiredError") {
    error = new AppError("Token expired", 401, "JWT_EXPIRED");
  }

  // Optional: Handle SyntaxError for malformed JSON
  if (err instanceof SyntaxError && "body" in err) {
    error = new AppError("Malformed JSON body", 400, "SYNTAX_ERROR");
  }

  // Use error status code or default to 500
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  const code = error.code || "INTERNAL_ERROR";

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      ...(process.env.NODE_ENV === "development" && {
        stack: err.stack,
        details: err,
      }),
    },
  });
};

// Strongly typed async handler wrapper
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
