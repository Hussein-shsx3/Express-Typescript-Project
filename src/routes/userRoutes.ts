import express from "express";
import {
  getMe,
  updateMe,
  deleteMe,
  updateProfilePicture,
  changePassword,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
} from "../controllers/userController";
import { protect, adminProtect } from "../middlewares/authMiddleware";
import upload from "../middlewares/multer";

const router = express.Router();

// Routes for logged-in user (user role)
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.delete("/me", protect, deleteMe);
router.patch(
  "/me/picture",
  protect,
  upload.single("picture"),
  updateProfilePicture
);
router.patch("/change-password", protect, changePassword);

// Routes for admin only
router.get("/", protect, adminProtect, getAllUsers);
router.get("/:id", protect, adminProtect, getUserById);
router.put("/:id", protect, adminProtect, updateUserById);
router.delete("/:id", protect, adminProtect, deleteUserById);

export default router;
