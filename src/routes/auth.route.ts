import { Router } from "express";
import { asyncHandler } from "../util/helper";
import {
  loginAdmin,
  profile,
  register,
  sentSms,
  verifyOtp,
} from "../controllers/auth.controller";

const authRoute = Router();

authRoute.post("/register", asyncHandler(register));
authRoute.post("/login-admin", asyncHandler(loginAdmin));
// authRoute.get("/profile", [authMiddleware], asyncHandler(profile));
// authRoute.put("/update-user", [authMiddleware], asyncHandler(updateProfile));
authRoute.post("/send-sms", asyncHandler(sentSms));
authRoute.post("/verify-sms", asyncHandler(verifyOtp));

export default authRoute;
