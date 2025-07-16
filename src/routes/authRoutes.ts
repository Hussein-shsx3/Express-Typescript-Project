import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from "../controllers/authController";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

router.post("/logout", logoutUser);
router.get("/refresh-token", refreshToken);

export default router;
