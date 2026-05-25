import express from "express";
import { asyncHandler } from "../util/helper.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { Role } from "../../generated/prisma/enums.ts";
import {
  ownerDashboardStats,
  ownerListRestaurants,
  ownerGetRestaurant,
  ownerCreateRestaurant,
  ownerUpdateRestaurant,
  ownerDeleteRestaurant,
  ownerListBookings,
  ownerGetBooking,
  ownerUpdateBooking,
  ownerListRequests,
  ownerCreateRequest,
} from "../controllers/owner.controller.ts";

const ownerRoute = express.Router();

// All owner routes require OWNER role
ownerRoute.use(authMiddleware([Role.OWNER]));

// ── Dashboard ──────────────────────────────────────────────────────────────
ownerRoute.get("/dashboard/stats", asyncHandler(ownerDashboardStats));

// ── Restaurants ────────────────────────────────────────────────────────────
ownerRoute.get("/restaurants",        asyncHandler(ownerListRestaurants));
ownerRoute.get("/restaurants/:id",    asyncHandler(ownerGetRestaurant));
ownerRoute.post("/restaurants",       asyncHandler(ownerCreateRestaurant));
ownerRoute.put("/restaurants/:id",    asyncHandler(ownerUpdateRestaurant));
ownerRoute.delete("/restaurants/:id", asyncHandler(ownerDeleteRestaurant));

// ── Bookings ───────────────────────────────────────────────────────────────
ownerRoute.get("/bookings",       asyncHandler(ownerListBookings));
ownerRoute.get("/bookings/:id",   asyncHandler(ownerGetBooking));
ownerRoute.put("/bookings/:id",   asyncHandler(ownerUpdateBooking));

// ── Restaurant Requests ────────────────────────────────────────────────────
ownerRoute.get("/restaurant-requests",  asyncHandler(ownerListRequests));
ownerRoute.post("/restaurant-requests", asyncHandler(ownerCreateRequest));

export default ownerRoute;
