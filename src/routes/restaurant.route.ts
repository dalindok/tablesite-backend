import express from "express";
import multer from "multer";
import { asyncHandler } from "../util/helper.ts";
import {
  listRestaurants,
  getRestaurantDetail,
  toggleFavorite,
  getFavorites,
  importRestaurantsFromFile,
  createRestaurant,
  updateRestaurant,
  updateRestaurantStatus,
  deleteRestaurant,
  listAddressesWithRestaurantCount,
} from "../controllers/restaurant.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { Role } from "../../generated/prisma/enums.ts";

const upload = multer({ storage: multer.memoryStorage() });
const restaurantRoute = express.Router();

// Public routes
restaurantRoute.get("/", asyncHandler(listRestaurants));
restaurantRoute.get(
  "/addresses",
  asyncHandler(listAddressesWithRestaurantCount),
);
restaurantRoute.get("/:id", asyncHandler(getRestaurantDetail));

// Protected routes - Admin only
restaurantRoute.post(
  "/import",
  authMiddleware([Role.ADMIN]),
  upload.single("file"),
  asyncHandler(importRestaurantsFromFile),
);
restaurantRoute.post(
  "/",
  authMiddleware([Role.ADMIN]),
  asyncHandler(createRestaurant),
);

// Protected routes - Owner or Admin
restaurantRoute.put(
  "/:id",
  authMiddleware([Role.OWNER, Role.ADMIN]),
  asyncHandler(updateRestaurant),
);
restaurantRoute.put(
  "/:id/status",
  authMiddleware([Role.ADMIN]),
  asyncHandler(updateRestaurantStatus),
);
restaurantRoute.delete(
  "/:id",
  authMiddleware([Role.OWNER, Role.ADMIN]),
  asyncHandler(deleteRestaurant),
);

// Protected routes - All authenticated users
restaurantRoute.get(
  "/favorites/list",
  authMiddleware(),
  asyncHandler(getFavorites),
);
restaurantRoute.post(
  "/favorites/toggle",
  authMiddleware(),
  asyncHandler(toggleFavorite),
);

export default restaurantRoute;
