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
  ownerGetRestaurantFull,
  ownerUpdateHours,
  ownerListTables,
  ownerCreateTable,
  ownerUpdateTable,
  ownerDeleteTable,
  ownerAddGalleryImage,
  ownerDeleteGalleryImage,
  ownerUpdateTags,
  ownerAddClosure,
  ownerDeleteClosure,
} from "../controllers/owner.controller.ts";

const ownerRoute = express.Router();

// All owner routes require OWNER role
ownerRoute.use(authMiddleware([Role.OWNER]));

// ── Dashboard ──────────────────────────────────────────────────────────────
ownerRoute.get("/dashboard/stats", asyncHandler(ownerDashboardStats));

// ── Restaurants ────────────────────────────────────────────────────────────
ownerRoute.get("/restaurants",              asyncHandler(ownerListRestaurants));
ownerRoute.get("/restaurants/:id",          asyncHandler(ownerGetRestaurant));
ownerRoute.get("/restaurants/:id/full",     asyncHandler(ownerGetRestaurantFull));
ownerRoute.post("/restaurants",             asyncHandler(ownerCreateRestaurant));
ownerRoute.put("/restaurants/:id",          asyncHandler(ownerUpdateRestaurant));
ownerRoute.delete("/restaurants/:id",       asyncHandler(ownerDeleteRestaurant));

// ── Restaurant — Operating Hours ───────────────────────────────────────────
ownerRoute.put("/restaurants/:id/hours", asyncHandler(ownerUpdateHours));

// ── Restaurant — Tables ────────────────────────────────────────────────────
ownerRoute.get("/restaurants/:id/tables",                asyncHandler(ownerListTables));
ownerRoute.post("/restaurants/:id/tables",               asyncHandler(ownerCreateTable));
ownerRoute.put("/restaurants/:id/tables/:tableId",       asyncHandler(ownerUpdateTable));
ownerRoute.delete("/restaurants/:id/tables/:tableId",    asyncHandler(ownerDeleteTable));

// ── Restaurant — Gallery ───────────────────────────────────────────────────
ownerRoute.post("/restaurants/:id/gallery",              asyncHandler(ownerAddGalleryImage));
ownerRoute.delete("/restaurants/:id/gallery/:imageId",   asyncHandler(ownerDeleteGalleryImage));

// ── Restaurant — Tags ──────────────────────────────────────────────────────
ownerRoute.put("/restaurants/:id/tags", asyncHandler(ownerUpdateTags));

// ── Restaurant — Special Closures ─────────────────────────────────────────
ownerRoute.post("/restaurants/:id/closures",             asyncHandler(ownerAddClosure));
ownerRoute.delete("/restaurants/:id/closures/:closureId",asyncHandler(ownerDeleteClosure));

// ── Bookings ───────────────────────────────────────────────────────────────
ownerRoute.get("/bookings",       asyncHandler(ownerListBookings));
ownerRoute.get("/bookings/:id",   asyncHandler(ownerGetBooking));
ownerRoute.put("/bookings/:id",   asyncHandler(ownerUpdateBooking));

// ── Restaurant Requests ────────────────────────────────────────────────────
ownerRoute.get("/restaurant-requests",  asyncHandler(ownerListRequests));
ownerRoute.post("/restaurant-requests", asyncHandler(ownerCreateRequest));

export default ownerRoute;
