import { Request, Response, NextFunction } from "express";
import { Model, PopulateOptions } from "mongoose";
import { asyncHandler } from "../middlewares/errorMiddleware";
import { AppError } from "../middlewares/errorMiddleware";

// Get All
export const getAll = <T>(Model: Model<T>) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    let { page = "1", limit = "10" } = req.query;

    // Parse query params to numbers
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (pageNum <= 0 || limitNum <= 0) {
      throw new AppError("Page and limit must be positive numbers", 400);
    }

    const skip = (pageNum - 1) * limitNum;

    // Count total documents for metadata
    const totalDocuments = await Model.countDocuments();

    const docs = await Model.find().skip(skip).limit(limitNum);

    const totalPages = Math.ceil(totalDocuments / limitNum);

    res.status(200).json({
      success: true,
      count: docs.length,
      page: pageNum,
      totalPages,
      totalDocuments,
      data: docs,
    });
  });

// Get One
export const getOne = <T>(
  Model: Model<T>,
  populateOptions?: PopulateOptions | (string | PopulateOptions)[]
) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    let query = Model.findById(req.params.id);

    if (populateOptions) {
      query = query.populate(populateOptions);
    }

    const doc = await query;

    if (!doc) {
      throw new AppError("Document not found", 404);
    }

    res.status(200).json({
      success: true,
      data: doc,
    });
  });

// Create One
export const createOne = <T>(Model: Model<T>) =>
  asyncHandler(async (req: Request, res: Response) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      success: true,
      data: doc,
    });
  });

// Update One
export const updateOne = <T>(Model: Model<T>) =>
  asyncHandler(async (req: Request, res: Response) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      throw new AppError("Document not found", 404);
    }
    res.status(200).json({
      success: true,
      data: doc,
    });
  });

// Delete One
export const deleteOne = <T>(Model: Model<T>) =>
  asyncHandler(async (req: Request, res: Response) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      throw new AppError("Document not found", 404);
    }
    res.status(204).json({
      success: true,
      data: null,
    });
  });
