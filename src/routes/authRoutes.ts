import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
} from "../controllers/authController";

const router = express.Router();

// @route   POST /api/auth/register
router.post("/register", registerUser);

// @route   POST /api/auth/login
router.post("/login", loginUser);

// @route   POST /api/auth/logout
router.post("/logout", logoutUser);

// @route   GET /api/auth/refresh-token
router.get("/refresh-token", refreshToken);

export default router;
