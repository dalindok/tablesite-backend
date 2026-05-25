import express from "express";
import { asyncHandler } from "../util/helper.ts";
import {
  login,
  loginAdmin,
  profile,
  register,
  updateProfile,
  sentSms,
  verifyOtp,
  changePassword,
  logout,
} from "../controllers/auth.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";

const authRoute = express.Router();

authRoute.post("/register", asyncHandler(register));
authRoute.post("/login", asyncHandler(login));
authRoute.post("/login-admin", asyncHandler(loginAdmin));

// /auth/me — alias for /auth/profile (used by management dashboard)
authRoute.get("/me", authMiddleware(), asyncHandler(profile));
authRoute.get("/profile", authMiddleware(), asyncHandler(profile));
authRoute.post("/logout", authMiddleware(), asyncHandler(logout));

authRoute.put("/update-user", authMiddleware(), asyncHandler(updateProfile));
authRoute.put(
  "/change-password",
  authMiddleware(),
  asyncHandler(changePassword),
);

authRoute.post("/send-sms", asyncHandler(sentSms));
authRoute.post("/verify-sms", asyncHandler(verifyOtp));

export default authRoute;
