import { z } from "zod";

export const createMenuSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  is_active: z.boolean().optional().default(true),
  sort_order: z.coerce.number().int().optional().default(0),
});

export const updateMenuSchema = createMenuSchema.partial().extend({
  id: z.number().int().positive(),
  restaurant_id: z.number().int().positive(),
});

export const deleteMenuSchema = z.object({
  id: z.number().int().positive(),
  restaurant_id: z.number().int().positive(),
});

export const createMenuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  image_url: z.string().url().optional(),
  category: z.string().optional(),
  is_available: z.boolean().optional().default(true),
  is_vegan: z.boolean().optional().default(false),
  is_vegetarian: z.boolean().optional().default(false),
  is_gluten_free: z.boolean().optional().default(false),
  sort_order: z.coerce.number().int().optional().default(0),
});

export const updateMenuItemSchema = createMenuItemSchema.partial().extend({
  id: z.number().int().positive(),
  menu_id: z.number().int().positive(),
});

export const deleteMenuItemSchema = z.object({
  id: z.number().int().positive(),
  menu_id: z.number().int().positive(),
});

export const getRestaurantMenusSchema = z.object({
  restaurant_id: z.number().int().positive(),
  include_inactive: z.coerce.boolean().optional().default(false),
});

export type CreateMenuBody = z.infer<typeof createMenuSchema>;
export type UpdateMenuBody = z.infer<typeof updateMenuSchema>;
export type DeleteMenuBody = z.infer<typeof deleteMenuSchema>;
export type CreateMenuItemBody = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemBody = z.infer<typeof updateMenuItemSchema>;
export type DeleteMenuItemBody = z.infer<typeof deleteMenuItemSchema>;
export type GetRestaurantMenusQuery = z.infer<typeof getRestaurantMenusSchema>;
