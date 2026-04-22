import type { NextFunction, Response } from "express";
import { prisma } from "../util/prisma.ts";
import { AppError } from "../errors/AppError.ts";
import { successResponse } from "../util/helper.ts";
import {
  createMenuSchema,
  updateMenuSchema,
  deleteMenuSchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  deleteMenuItemSchema,
  getRestaurantMenusSchema,
} from "../schemas/menu.schema.ts";
import type { AuthRequest } from "../middlewares/auth.middleware.ts";
import { Role } from "../../generated/prisma/enums.ts";

// Get all menus for a restaurant (Public)
export const getRestaurantMenus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { restaurant_id } = req.params;
    const { include_inactive } = req.query;

    if (!restaurant_id || isNaN(Number(restaurant_id))) {
      return next(new AppError("Invalid restaurant ID", 400, "INVALID_ID"));
    }

    // Check if restaurant exists and is active
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: Number(restaurant_id) },
      select: { id: true, status: true },
    });

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    }

    const where: any = { restaurant_id: Number(restaurant_id) };
    if (!include_inactive) {
      where.is_active = true;
    }

    const menus = await prisma.menu.findMany({
      where,
      include: {
        items: {
          where: { is_available: true },
          orderBy: { sort_order: "asc" },
        },
      },
      orderBy: { sort_order: "asc" },
    });

    return res.json(
      successResponse("Restaurant menus fetched successfully", {
        restaurant_id: Number(restaurant_id),
        menus,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

// Create menu (Owner or Admin)
export const createMenu = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  const parseResult = createMenuSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid request body",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  try {
    const { restaurant_id } = req.params;

    if (!restaurant_id || isNaN(Number(restaurant_id))) {
      return next(new AppError("Invalid restaurant ID", 400, "INVALID_ID"));
    }

    // Check if restaurant exists and user is authorized
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: Number(restaurant_id) },
      include: { owner: true },
    });

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    }

    // Check authorization
    if (
      req.user.role !== Role.ADMIN &&
      (req.user.role !== Role.OWNER || restaurant.owner.user_id !== req.user.id)
    ) {
      return next(
        new AppError(
          "Not authorized to create menus for this restaurant",
          403,
          "FORBIDDEN",
        ),
      );
    }

    const data = parseResult.data;

    // Check for duplicate menu name
    const existingMenu = await prisma.menu.findUnique({
      where: {
        restaurant_id_name: {
          restaurant_id: Number(restaurant_id),
          name: data.name,
        },
      },
    });

    if (existingMenu) {
      return next(
        new AppError(
          `Menu with name "${data.name}" already exists`,
          400,
          "DUPLICATE_MENU",
        ),
      );
    }

    const menu = await prisma.menu.create({
      data: {
        restaurant_id: Number(restaurant_id),
        name: data.name,
        description: data.description || null,
        is_active: data.is_active,
        sort_order: data.sort_order,
      },
      include: {
        items: true,
      },
    });

    return res
      .status(201)
      .json(successResponse("Menu created successfully", menu));
  } catch (error) {
    return next(error);
  }
};

// Update menu (Owner or Admin)
export const updateMenu = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  const parseResult = updateMenuSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid request body",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  try {
    const { restaurant_id, id, ...updateData } = parseResult.data;

    // Check if restaurant exists and user is authorized
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurant_id },
      include: { owner: true },
    });

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    }

    // Check authorization
    if (
      req.user.role !== Role.ADMIN &&
      (req.user.role !== Role.OWNER || restaurant.owner.user_id !== req.user.id)
    ) {
      return next(
        new AppError(
          "Not authorized to update menus for this restaurant",
          403,
          "FORBIDDEN",
        ),
      );
    }

    // Check if menu exists
    const menu = await prisma.menu.findUnique({
      where: { id },
    });

    if (!menu || menu.restaurant_id !== restaurant_id) {
      return next(new AppError("Menu not found", 404, "NOT_FOUND"));
    }

    const updatedMenu = await prisma.menu.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          orderBy: { sort_order: "asc" },
        },
      },
    });

    return res.json(successResponse("Menu updated successfully", updatedMenu));
  } catch (error) {
    return next(error);
  }
};

// Delete menu (Owner or Admin)
export const deleteMenu = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  const parseResult = deleteMenuSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid request body",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  try {
    const { restaurant_id, id } = parseResult.data;

    // Check if restaurant exists and user is authorized
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurant_id },
      include: { owner: true },
    });

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    }

    // Check authorization
    if (
      req.user.role !== Role.ADMIN &&
      (req.user.role !== Role.OWNER || restaurant.owner.user_id !== req.user.id)
    ) {
      return next(
        new AppError(
          "Not authorized to delete menus for this restaurant",
          403,
          "FORBIDDEN",
        ),
      );
    }

    // Check if menu exists
    const menu = await prisma.menu.findUnique({
      where: { id },
    });

    if (!menu || menu.restaurant_id !== restaurant_id) {
      return next(new AppError("Menu not found", 404, "NOT_FOUND"));
    }

    await prisma.menu.delete({
      where: { id },
    });

    return res.json(successResponse("Menu deleted successfully"));
  } catch (error) {
    return next(error);
  }
};

// Get menu with items (Public)
export const getMenuWithItems = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { restaurant_id, menu_id } = req.params;

    if (!restaurant_id || isNaN(Number(restaurant_id))) {
      return next(new AppError("Invalid restaurant ID", 400, "INVALID_ID"));
    }

    if (!menu_id || isNaN(Number(menu_id))) {
      return next(new AppError("Invalid menu ID", 400, "INVALID_ID"));
    }

    const menu = await prisma.menu.findUnique({
      where: { id: Number(menu_id) },
      include: {
        items: {
          where: { is_available: true },
          orderBy: { sort_order: "asc" },
        },
      },
    });

    if (!menu || menu.restaurant_id !== Number(restaurant_id)) {
      return next(new AppError("Menu not found", 404, "NOT_FOUND"));
    }

    return res.json(successResponse("Menu items fetched successfully", menu));
  } catch (error) {
    return next(error);
  }
};

// Create menu item (Owner or Admin)
export const createMenuItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  const parseResult = createMenuItemSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid request body",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  try {
    const { restaurant_id, menu_id } = req.params;

    if (!restaurant_id || isNaN(Number(restaurant_id))) {
      return next(new AppError("Invalid restaurant ID", 400, "INVALID_ID"));
    }

    if (!menu_id || isNaN(Number(menu_id))) {
      return next(new AppError("Invalid menu ID", 400, "INVALID_ID"));
    }

    // Check if restaurant exists and user is authorized
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: Number(restaurant_id) },
      include: { owner: true },
    });

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    }

    // Check authorization
    if (
      req.user.role !== Role.ADMIN &&
      (req.user.role !== Role.OWNER || restaurant.owner.user_id !== req.user.id)
    ) {
      return next(
        new AppError(
          "Not authorized to add items to this restaurant's menu",
          403,
          "FORBIDDEN",
        ),
      );
    }

    // Check if menu exists
    const menu = await prisma.menu.findUnique({
      where: { id: Number(menu_id) },
    });

    if (!menu || menu.restaurant_id !== Number(restaurant_id)) {
      return next(new AppError("Menu not found", 404, "NOT_FOUND"));
    }

    const data = parseResult.data;

    const menuItem = await prisma.menuItem.create({
      data: {
        menu_id: Number(menu_id),
        name: data.name,
        description: data.description || null,
        price: data.price,
        image_url: data.image_url || null,
        category: data.category || null,
        is_available: data.is_available,
        is_vegan: data.is_vegan,
        is_vegetarian: data.is_vegetarian,
        is_gluten_free: data.is_gluten_free,
        sort_order: data.sort_order,
      },
    });

    return res
      .status(201)
      .json(successResponse("Menu item created successfully", menuItem));
  } catch (error) {
    return next(error);
  }
};

// Update menu item (Owner or Admin)
export const updateMenuItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  const parseResult = updateMenuItemSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid request body",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  try {
    const { restaurant_id, menu_id, id: itemId } = req.params;
    const updateData = parseResult.data;

    // Check if restaurant exists and user is authorized
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: Number(restaurant_id) },
      include: { owner: true },
    });

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    }

    // Check authorization
    if (
      req.user.role !== Role.ADMIN &&
      (req.user.role !== Role.OWNER || restaurant.owner.user_id !== req.user.id)
    ) {
      return next(
        new AppError(
          "Not authorized to update items in this restaurant's menu",
          403,
          "FORBIDDEN",
        ),
      );
    }

    // Check if menu item exists
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: Number(itemId) },
      include: { menu: true },
    });

    if (!menuItem || menuItem.menu_id !== Number(menu_id)) {
      return next(new AppError("Menu item not found", 404, "NOT_FOUND"));
    }

    const updatedMenuItem = await prisma.menuItem.update({
      where: { id: Number(itemId) },
      data: updateData,
    });

    return res.json(
      successResponse("Menu item updated successfully", updatedMenuItem),
    );
  } catch (error) {
    return next(error);
  }
};

// Delete menu item (Owner or Admin)
export const deleteMenuItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  const parseResult = deleteMenuItemSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid request body",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  try {
    const { restaurant_id, menu_id, id: itemId } = req.params;

    // Check if restaurant exists and user is authorized
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: Number(restaurant_id) },
      include: { owner: true },
    });

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    }

    // Check authorization
    if (
      req.user.role !== Role.ADMIN &&
      (req.user.role !== Role.OWNER || restaurant.owner.user_id !== req.user.id)
    ) {
      return next(
        new AppError(
          "Not authorized to delete items from this restaurant's menu",
          403,
          "FORBIDDEN",
        ),
      );
    }

    // Check if menu item exists
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: Number(itemId) },
      include: { menu: true },
    });

    if (!menuItem || menuItem.menu_id !== Number(menu_id)) {
      return next(new AppError("Menu item not found", 404, "NOT_FOUND"));
    }

    await prisma.menuItem.delete({
      where: { id: Number(itemId) },
    });

    return res.json(successResponse("Menu item deleted successfully"));
  } catch (error) {
    return next(error);
  }
};
