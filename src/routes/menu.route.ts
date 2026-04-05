import express from "express";
import { asyncHandler } from "../util/helper.ts";
import {
  getRestaurantMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  getMenuWithItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/menu.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { Role } from "../../generated/prisma/enums.ts";

const menuRoute = express.Router();

// Public routes - Get menus
menuRoute.get("/:restaurant_id/menus", asyncHandler(getRestaurantMenus));
menuRoute.get("/:restaurant_id/menus/:menu_id", asyncHandler(getMenuWithItems));

// Protected routes - Manage menus (Owner or Admin)
menuRoute.post(
  "/:restaurant_id/menus",
  authMiddleware([Role.OWNER, Role.ADMIN]),
  asyncHandler(createMenu),
);
menuRoute.put(
  "/:restaurant_id/menus/:id",
  authMiddleware([Role.OWNER, Role.ADMIN]),
  asyncHandler(updateMenu),
);
menuRoute.delete(
  "/:restaurant_id/menus/:id",
  authMiddleware([Role.OWNER, Role.ADMIN]),
  asyncHandler(deleteMenu),
);

// Protected routes - Manage menu items (Owner or Admin)
menuRoute.post(
  "/:restaurant_id/menus/:menu_id/items",
  authMiddleware([Role.OWNER, Role.ADMIN]),
  asyncHandler(createMenuItem),
);
menuRoute.put(
  "/:restaurant_id/menus/:menu_id/items/:id",
  authMiddleware([Role.OWNER, Role.ADMIN]),
  asyncHandler(updateMenuItem),
);
menuRoute.delete(
  "/:restaurant_id/menus/:menu_id/items/:id",
  authMiddleware([Role.OWNER, Role.ADMIN]),
  asyncHandler(deleteMenuItem),
);

export default menuRoute;
