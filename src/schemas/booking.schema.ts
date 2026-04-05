import { z } from "zod";

export const createBookingSchema = z.object({
  restaurant_id: z.number().int().positive(),
  booking_date: z.string().date(), // YYYY-MM-DD
  booking_time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM 24-hour format
  party_size: z.number().int().positive(),
  duration_minutes: z.number().int().positive().optional().default(90),
  special_requests: z.string().optional(),
  table_ids: z.array(z.number().int().positive()).optional(), // Optional: pre-select tables
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
});

export const acceptBookingSchema = z.object({
  table_ids: z.array(z.number().int().positive()).optional(),
});

export const rejectBookingSchema = z.object({
  reason: z.string().optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});

export const completeBookingSchema = z.object({
  no_show: z.boolean().optional().default(false),
});

// Filter schemas
export const customerBookingFilterSchema = z.object({
  status: z
    .enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"])
    .optional(),
  booking_type: z.enum(["history", "upcoming"]).optional().default("upcoming"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(20),
});

export const restaurantBookingFilterSchema = z.object({
  booking_id: z.number().int().optional(),
  status: z
    .enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"])
    .optional(),
  customer_name: z.string().optional(),
  booking_date: z.string().date().optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(20),
});

// Type exports
export type CreateBookingBody = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusBody = z.infer<typeof updateBookingStatusSchema>;
export type AcceptBookingBody = z.infer<typeof acceptBookingSchema>;
export type RejectBookingBody = z.infer<typeof rejectBookingSchema>;
export type CancelBookingBody = z.infer<typeof cancelBookingSchema>;
export type CompleteBookingBody = z.infer<typeof completeBookingSchema>;
export type CustomerBookingFilter = z.infer<typeof customerBookingFilterSchema>;
export type RestaurantBookingFilter = z.infer<
  typeof restaurantBookingFilterSchema
>;
