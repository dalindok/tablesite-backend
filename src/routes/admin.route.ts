import express from "express";
import { asyncHandler } from "../util/helper.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { Role } from "../../generated/prisma/enums.ts";
import {
  adminDashboardStats,
  adminListUsers,
  adminGetUser,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  adminUpdateUserStatus,
  adminListRestaurants,
  adminUpdateRestaurant,
  adminUpdateRestaurantStatus,
  adminDeleteRestaurant,
  adminListBookings,
  adminGetBooking,
  adminUpdateBooking,
  adminDeleteBooking,
  adminListRequests,
  adminReviewRequest,
} from "../controllers/admin.controller.ts";

const adminRoute = express.Router();

// All admin routes require ADMIN role
adminRoute.use(authMiddleware([Role.ADMIN]));

// ── Dashboard ──────────────────────────────────────────────────────────────
adminRoute.get("/dashboard/stats", asyncHandler(adminDashboardStats));

// ── Users ──────────────────────────────────────────────────────────────────
adminRoute.get("/users",              asyncHandler(adminListUsers));
adminRoute.get("/users/:id",          asyncHandler(adminGetUser));
adminRoute.post("/users",             asyncHandler(adminCreateUser));
adminRoute.put("/users/:id",          asyncHandler(adminUpdateUser));
adminRoute.delete("/users/:id",       asyncHandler(adminDeleteUser));
adminRoute.patch("/users/:id/status", asyncHandler(adminUpdateUserStatus));

// ── Restaurants ────────────────────────────────────────────────────────────
adminRoute.get("/restaurants",                asyncHandler(adminListRestaurants));
adminRoute.put("/restaurants/:id",            asyncHandler(adminUpdateRestaurant));
adminRoute.patch("/restaurants/:id/status",   asyncHandler(adminUpdateRestaurantStatus));
adminRoute.delete("/restaurants/:id",         asyncHandler(adminDeleteRestaurant));

// ── Bookings ───────────────────────────────────────────────────────────────
adminRoute.get("/bookings",          asyncHandler(adminListBookings));
adminRoute.get("/bookings/:id",      asyncHandler(adminGetBooking));
adminRoute.put("/bookings/:id",      asyncHandler(adminUpdateBooking));
adminRoute.delete("/bookings/:id",   asyncHandler(adminDeleteBooking));

// ── Restaurant Requests ────────────────────────────────────────────────────
adminRoute.get("/restaurant-requests",              asyncHandler(adminListRequests));
adminRoute.put("/restaurant-requests/:id/review",   asyncHandler(adminReviewRequest));

export default adminRoute;
