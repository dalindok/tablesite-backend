import { z } from "zod";

export const restaurantListSearchSchema = z.object({
  search: z.string().optional(),
  cuisine: z.string().optional(),
  location: z.string().optional(),
  date: z.string().datetime().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  priceRate: z.enum(["low", "medium", "high"]).optional(),
  sortBy: z
    .enum(["popular", "rated", "newest", "distance", "top"])
    .optional()
    .default("popular"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(20),
  guestCount: z.coerce.number().int().positive().optional(),
  minCapacity: z.coerce.number().int().positive().optional(),
});

export const addFavoriteSchema = z.object({
  restaurant_id: z.number().int().positive(),
});

export const removeFavoriteSchema = z.object({
  restaurant_id: z.number().int().positive(),
});

// Operating Hours Schema
const operatingHourSchema = z.object({
  day_of_week: z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ]),
  open_time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  close_time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  is_closed: z.boolean().optional().default(false),
});

// Special Closure Schema
const specialClosureSchema = z.object({
  date: z.string().date(), // YYYY-MM-DD format
  reason: z.string().optional(),
});

// Gallery Image Schema
const galleryImageSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
  sort_order: z.number().int().optional().default(0),
});

// Menu Item Schema
const menuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  image_url: z.string().url().optional(),
  category: z.string().optional(),
  is_available: z.boolean().optional().default(true),
  is_vegan: z.boolean().optional().default(false),
  is_vegetarian: z.boolean().optional().default(false),
  is_gluten_free: z.boolean().optional().default(false),
  sort_order: z.number().int().optional().default(0),
});

// Menu Schema
const menuSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().optional(),
  image: z.string().url().optional(),
  is_active: z.boolean().optional().default(true),
  sort_order: z.number().int().optional().default(0),
  menu_items: z.array(menuItemSchema).optional(),
});

// Table Schema
const tableSchema = z.object({
  table_number: z.string().min(1),
  capacity: z.number().int().positive(),
  floor: z.string().optional(),
  description: z.string().optional(),
});

export const createRestaurantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  cuisine_type: z.string().optional(),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional(),
  country: z.string().min(1),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  cover_image_url: z.string().url().optional(),
  latitude: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/)
    .optional(),
  longitude: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/)
    .optional(),
  max_capacity: z.number().int().positive().optional(),
  min_capacity: z.number().int().positive().optional(),
  parking_available: z.boolean().optional().default(false),
  dress_code: z.string().optional(),
  min_booking_notice: z.coerce.number().int().optional().default(60),
  max_booking_days: z.coerce.number().int().optional().default(30),
  cancellation_hours: z.coerce.number().int().optional().default(24),
  deposit_required: z.boolean().optional().default(false),
  deposit_amount: z.coerce.number().optional(),
  operating_hours: z.array(operatingHourSchema).optional(),
  tables: z.array(tableSchema).optional(),
  special_closures: z.array(specialClosureSchema).optional(),
  tags: z.array(z.string()).optional(),
  gallery_images: z.array(galleryImageSchema).optional(),
  menus: z.array(menuSchema).optional(),
});

export const updateRestaurantSchema = createRestaurantSchema.partial().extend({
  id: z.number().int().positive(),
});

export const deleteRestaurantSchema = z.object({
  id: z.number().int().positive(),
});

export const updateRestaurantStatusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["ACTIVE", "CLOSED"]),
});

export const restaurantFileImportSchema = z.array(createRestaurantSchema);

export type RestaurantListSearchQuery = z.infer<
  typeof restaurantListSearchSchema
>;
export type AddFavoriteBody = z.infer<typeof addFavoriteSchema>;
export type RemoveFavoriteBody = z.infer<typeof removeFavoriteSchema>;
export type CreateRestaurantBody = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantBody = z.infer<typeof updateRestaurantSchema>;
export type DeleteRestaurantBody = z.infer<typeof deleteRestaurantSchema>;
export type UpdateRestaurantStatusBody = z.infer<
  typeof updateRestaurantStatusSchema
>;
export type RestaurantFileImport = z.infer<typeof restaurantFileImportSchema>;
export type OperatingHour = z.infer<typeof operatingHourSchema>;
export type GalleryImage = z.infer<typeof galleryImageSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type Menu = z.infer<typeof menuSchema>;
export type Table = z.infer<typeof tableSchema>;
export type SpecialClosure = z.infer<typeof specialClosureSchema>;
