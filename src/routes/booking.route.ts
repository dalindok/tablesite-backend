import express from "express";
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../middlewares/auth.middleware.ts";
import {
  createBooking,
  getCustomerBookings,
  getRestaurantBookings,
  getBookingDetail,
  cancelBooking,
  acceptBooking,
  rejectBooking,
  updateBookingStatus,
} from "../controllers/booking.controller.ts";

const router = express.Router();

// Customer endpoints
router.post("/create", optionalAuthMiddleware(), createBooking);
router.get("/my-bookings", authMiddleware(), getCustomerBookings);
router.get("/:booking_id", authMiddleware(), getBookingDetail);
router.post("/:booking_id/cancel", authMiddleware(), cancelBooking);

// Restaurant/Admin endpoints
router.get(
  "/restaurant/:restaurant_id",
  authMiddleware(),
  getRestaurantBookings,
);
router.post("/:booking_id/accept", authMiddleware(), acceptBooking);
router.post("/:booking_id/reject", authMiddleware(), rejectBooking);
router.patch("/:booking_id/status", authMiddleware(), updateBookingStatus);

export default router;
