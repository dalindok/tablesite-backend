import type { NextFunction, Response } from "express";
import { prisma } from "../util/prisma.ts";
import { AppError } from "../errors/AppError.ts";
import { successResponse, parseParamId } from "../util/helper.ts";
import type { AuthRequest } from "../middlewares/auth.middleware.ts";
import { BookingStatus, RestaurantStatus } from "../../generated/prisma/enums.ts";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_RESTAURANT_LIMIT = 3;

const paginationSchema = z.object({
  page:         z.coerce.number().int().positive().default(1),
  limit:        z.coerce.number().int().positive().default(10),
  search:       z.string().optional(),
  status:       z.string().optional(),
  restaurantId: z.coerce.number().int().positive().optional(),
});

const restaurantStatusMap: Record<string, RestaurantStatus> = {
  pending:   RestaurantStatus.PENDING_APPROVAL,
  active:    RestaurantStatus.ACTIVE,
  inactive:  RestaurantStatus.SUSPENDED,
  suspended: RestaurantStatus.SUSPENDED,
};

const restaurantStatusReverse: Record<string, string> = {
  PENDING_APPROVAL: "pending",
  ACTIVE:           "active",
  SUSPENDED:        "suspended",
  CLOSED:           "inactive",
};

const bookingStatusMap: Record<string, BookingStatus> = {
  pending:   BookingStatus.PENDING,
  confirmed: BookingStatus.CONFIRMED,
  cancelled: BookingStatus.CANCELLED,
  completed: BookingStatus.COMPLETED,
  no_show:   BookingStatus.NO_SHOW,
};

const bookingStatusReverse: Record<string, string> = {
  PENDING:   "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  NO_SHOW:   "no_show",
};

function formatRestaurant(r: any) {
  return {
    id:           r.id,
    name:         r.name,
    description:  r.description ?? null,
    address:      r.address,
    city:         r.city,
    phone:        r.phone ?? "",
    email:        r.email ?? "",
    cuisineType:  r.cuisine_type ?? "Other",
    capacity:     r.max_capacity ?? 0,
    openingTime:  r.operating_hours?.[0]?.open_time ?? "09:00",
    closingTime:  r.operating_hours?.[0]?.close_time ?? "22:00",
    image:        r.cover_image_url ?? null,
    status:       restaurantStatusReverse[r.status] ?? "pending",
    ownerId:      r.owner?.user?.id ?? r.owner_id,
    ownerName:    r.owner?.user
      ? `${r.owner.user.first_name} ${r.owner.user.last_name}`.trim()
      : null,
    rating:       Number(r.average_rating),
    createdAt:    r.created_at,
    updatedAt:    r.updated_at,
  };
}

function formatBooking(b: any) {
  const tableNumber = b.booking_tables?.[0]?.table?.table_number
    ? Number(b.booking_tables[0].table.table_number)
    : undefined;
  return {
    id:              b.id,
    restaurantId:    b.restaurant_id,
    restaurantName:  b.restaurant?.name ?? null,
    customerId:      b.customer_id,
    customerName:    b.customer?.user
      ? `${b.customer.user.first_name} ${b.customer.user.last_name}`.trim()
      : null,
    customerEmail:   b.customer?.user?.email ?? null,
    customerPhone:   b.customer?.user?.phone ?? null,
    date:            b.booking_date,
    time:            b.booking_time,
    partySize:       b.party_size,
    status:          bookingStatusReverse[b.status] ?? "pending",
    specialRequests: b.special_requests ?? null,
    tableNumber,
    createdAt:       b.created_at,
    updatedAt:       b.updated_at,
  };
}

function formatRequest(r: any) {
  return {
    id:             r.id,
    ownerId:        r.owner?.user?.id ?? null,
    ownerName:      r.owner?.user
      ? `${r.owner.user.first_name} ${r.owner.user.last_name}`.trim()
      : null,
    ownerEmail:     r.owner?.user?.email ?? null,
    currentCount:   r.current_count,
    requestedCount: r.requested_count,
    reason:         r.reason,
    status:         (r.status as string).toLowerCase(),
    adminNote:      r.admin_note ?? null,
    reviewedBy:     r.reviewed_by?.user
      ? `${r.reviewed_by.user.first_name} ${r.reviewed_by.user.last_name}`.trim()
      : null,
    reviewedAt:     r.reviewed_at ?? null,
    createdAt:      r.created_at,
    updatedAt:      r.updated_at,
  };
}

/** Resolve the RestaurantOwner record for the current user, or throw. */
async function resolveOwner(userId: number) {
  const owner = await prisma.restaurantOwner.findUnique({ where: { user_id: userId } });
  if (!owner) throw new AppError("Owner record not found", 403, "FORBIDDEN");
  return owner;
}

const restaurantInclude = {
  owner: {
    include: {
      user: { select: { id: true, first_name: true, last_name: true, email: true } },
    },
  },
  operating_hours: { select: { open_time: true, close_time: true, day_of_week: true }, take: 1 },
};

const bookingInclude = {
  restaurant:     { select: { id: true, name: true } },
  customer:       { include: { user: { select: { id: true, first_name: true, last_name: true, email: true, phone: true } } } },
  booking_tables: { include: { table: { select: { table_number: true } } } },
};

const requestInclude = {
  owner:       { include: { user: { select: { id: true, first_name: true, last_name: true, email: true } } } },
  reviewed_by: { include: { user: { select: { first_name: true, last_name: true } } } },
};

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export const ownerDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const owner = await resolveOwner(req.user!.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const ownerRestaurantIds = (
      await prisma.restaurant.findMany({ where: { owner_id: owner.id }, select: { id: true } })
    ).map((r) => r.id);

    const [
      totalRestaurants,
      activeRestaurants,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      todayBookings,
      recentBookings,
      allRequests,
    ] = await Promise.all([
      prisma.restaurant.count({ where: { owner_id: owner.id } }),
      prisma.restaurant.count({ where: { owner_id: owner.id, status: RestaurantStatus.ACTIVE } }),
      prisma.booking.count({ where: { restaurant_id: { in: ownerRestaurantIds } } }),
      prisma.booking.count({ where: { restaurant_id: { in: ownerRestaurantIds }, status: BookingStatus.PENDING } }),
      prisma.booking.count({ where: { restaurant_id: { in: ownerRestaurantIds }, status: BookingStatus.CONFIRMED } }),
      prisma.booking.count({ where: { restaurant_id: { in: ownerRestaurantIds }, booking_date: { gte: today, lt: tomorrow } } }),
      prisma.booking.findMany({
        where: { restaurant_id: { in: ownerRestaurantIds } },
        take: 10,
        orderBy: { created_at: "desc" },
        include: bookingInclude,
      }),
      prisma.restaurantRequest.findMany({ where: { owner_id: owner.id }, select: { status: true } }),
    ]);

    // Determine approved limit: start with DEFAULT + sum of approved request increments
    let approvedLimit = DEFAULT_RESTAURANT_LIMIT;
    for (const r of allRequests) {
      if (r.status === "APPROVED") {
        // Each approved request just lifts the limit — we'll get the latest approved requested_count
      }
    }
    // Get the latest approved request to determine current allowed limit
    const latestApproved = await prisma.restaurantRequest.findFirst({
      where:   { owner_id: owner.id, status: "APPROVED" },
      orderBy: { reviewed_at: "desc" },
    });
    if (latestApproved) approvedLimit = latestApproved.requested_count;

    const canAddRestaurant = totalRestaurants < approvedLimit;

    return res.json(
      successResponse("Owner dashboard stats", {
        totalRestaurants,
        activeRestaurants,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        todayBookings,
        canAddRestaurant,
        recentBookings: recentBookings.map(formatBooking),
      }),
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Restaurants
// ─────────────────────────────────────────────────────────────────────────────

export const ownerListRestaurants = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const owner  = await resolveOwner(req.user!.id);
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return next(new AppError("Invalid query", 400, "VALIDATION_ERROR"));
    const { page, limit, search } = parsed.data;
    const skip = (page - 1) * limit;

    const where: any = { owner_id: owner.id };
    if (search) {
      where.OR = [
        { name:         { contains: search } },
        { city:         { contains: search } },
        { cuisine_type: { contains: search } },
      ];
    }

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({ where, skip, take: limit, orderBy: { created_at: "desc" }, include: restaurantInclude }),
      prisma.restaurant.count({ where }),
    ]);

    return res.json(
      successResponse("Owner restaurants fetched", {
        data:       restaurants.map(formatRestaurant),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }),
    );
  } catch (err) {
    next(err);
  }
};

export const ownerGetRestaurant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const owner = await resolveOwner(req.user!.id);
    const id    = parseParamId(req.params.id);
    const restaurant = await prisma.restaurant.findFirst({
      where:   { id, owner_id: owner.id },
      include: restaurantInclude,
    });
    if (!restaurant) return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    return res.json(successResponse("Restaurant fetched", formatRestaurant(restaurant)));
  } catch (err) {
    next(err);
  }
};

export const ownerCreateRestaurant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const owner = await resolveOwner(req.user!.id);

    // Check restaurant limit
    const currentCount = await prisma.restaurant.count({ where: { owner_id: owner.id } });
    const latestApproved = await prisma.restaurantRequest.findFirst({
      where:   { owner_id: owner.id, status: "APPROVED" },
      orderBy: { reviewed_at: "desc" },
    });
    const limit = latestApproved ? latestApproved.requested_count : DEFAULT_RESTAURANT_LIMIT;
    if (currentCount >= limit) {
      return next(new AppError(`Restaurant limit reached (${currentCount}/${limit}). Submit a request to add more.`, 403, "RESTAURANT_LIMIT_REACHED"));
    }

    const schema = z.object({
      name:        z.string().min(1),
      description: z.string().optional(),
      address:     z.string().min(1),
      city:        z.string().min(1),
      phone:       z.string().optional(),
      email:       z.string().email().optional(),
      cuisineType: z.string().optional(),
      capacity:    z.number().int().positive().optional(),
      openingTime: z.string().optional(),
      closingTime: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(new AppError("Invalid payload", 400, "VALIDATION_ERROR", parsed.error.issues));

    const { cuisineType, capacity, openingTime, closingTime, ...rest } = parsed.data;

    // Generate a slug
    const baseSlug = (rest.name ?? "restaurant")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const uniqueSlug = `${baseSlug}-${Date.now()}`;

    const restaurant = await prisma.restaurant.create({
      data: {
        ...rest,
        slug:         uniqueSlug,
        cuisine_type: cuisineType,
        max_capacity: capacity,
        country:      "KH",
        owner_id:     owner.id,
        status:       RestaurantStatus.PENDING_APPROVAL,
        ...(openingTime && closingTime && {
          operating_hours: {
            create: [
              "MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY",
            ].map((day) => ({
              day_of_week: day as any,
              open_time:   openingTime,
              close_time:  closingTime,
            })),
          },
        }),
      },
      include: restaurantInclude,
    });

    return res.status(201).json(successResponse("Restaurant created", formatRestaurant(restaurant)));
  } catch (err) {
    next(err);
  }
};

export const ownerUpdateRestaurant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const owner = await resolveOwner(req.user!.id);
    const id    = parseParamId(req.params.id);

    const existing = await prisma.restaurant.findFirst({ where: { id, owner_id: owner.id } });
    if (!existing) return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));

    const schema = z.object({
      name:        z.string().optional(),
      description: z.string().optional(),
      address:     z.string().optional(),
      city:        z.string().optional(),
      phone:       z.string().optional(),
      email:       z.string().email().optional(),
      cuisineType: z.string().optional(),
      capacity:    z.number().int().positive().optional(),
      openingTime: z.string().optional(),
      closingTime: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(new AppError("Invalid payload", 400, "VALIDATION_ERROR", parsed.error.issues));

    const { cuisineType, capacity, openingTime, closingTime, ...rest } = parsed.data;
    const updateData: any = { ...rest };
    if (cuisineType) updateData.cuisine_type = cuisineType;
    if (capacity)    updateData.max_capacity = capacity;

    const restaurant = await prisma.restaurant.update({
      where:   { id },
      data:    updateData,
      include: restaurantInclude,
    });

    // Update operating hours if provided
    if (openingTime && closingTime) {
      await prisma.operatingHour.updateMany({
        where: { restaurant_id: id },
        data:  { open_time: openingTime, close_time: closingTime },
      });
    }

    return res.json(successResponse("Restaurant updated", formatRestaurant(restaurant)));
  } catch (err) {
    next(err);
  }
};

export const ownerDeleteRestaurant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const owner = await resolveOwner(req.user!.id);
    const id    = parseParamId(req.params.id);

    const existing = await prisma.restaurant.findFirst({ where: { id, owner_id: owner.id } });
    if (!existing) return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));

    await prisma.restaurant.delete({ where: { id } });
    return res.json(successResponse("Restaurant deleted", {}));
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Bookings
// ─────────────────────────────────────────────────────────────────────────────

export const ownerListBookings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const owner  = await resolveOwner(req.user!.id);
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return next(new AppError("Invalid query", 400, "VALIDATION_ERROR"));
    const { page, limit, search, status, restaurantId } = parsed.data;
    const skip = (page - 1) * limit;

    // Restrict to owner's restaurants
    const ownerRestaurantIds = (
      await prisma.restaurant.findMany({ where: { owner_id: owner.id }, select: { id: true } })
    ).map((r) => r.id);

    const where: any = {
      restaurant_id: restaurantId
        ? (ownerRestaurantIds.includes(restaurantId) ? restaurantId : -1)
        : { in: ownerRestaurantIds },
    };
    if (search) {
      where.OR = [
        { restaurant: { name: { contains: search } } },
        { customer:   { user: { first_name: { contains: search } } } },
        { customer:   { user: { last_name:  { contains: search } } } },
        { customer:   { user: { email:      { contains: search } } } },
      ];
    }
    if (status) {
      const dbStatus = bookingStatusMap[status.toLowerCase()];
      if (dbStatus) where.status = dbStatus;
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({ where, skip, take: limit, orderBy: { created_at: "desc" }, include: bookingInclude }),
      prisma.booking.count({ where }),
    ]);

    return res.json(
      successResponse("Owner bookings fetched", {
        data:       bookings.map(formatBooking),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }),
    );
  } catch (err) {
    next(err);
  }
};

export const ownerGetBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const owner = await resolveOwner(req.user!.id);
    const id    = parseParamId(req.params.id);

    const ownerRestaurantIds = (
      await prisma.restaurant.findMany({ where: { owner_id: owner.id }, select: { id: true } })
    ).map((r) => r.id);

    const booking = await prisma.booking.findFirst({
      where:   { id, restaurant_id: { in: ownerRestaurantIds } },
      include: bookingInclude,
    });
    if (!booking) return next(new AppError("Booking not found", 404, "NOT_FOUND"));
    return res.json(successResponse("Booking fetched", formatBooking(booking)));
  } catch (err) {
    next(err);
  }
};

export const ownerUpdateBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const owner = await resolveOwner(req.user!.id);
    const id    = parseParamId(req.params.id);

    const ownerRestaurantIds = (
      await prisma.restaurant.findMany({ where: { owner_id: owner.id }, select: { id: true } })
    ).map((r) => r.id);

    const existing = await prisma.booking.findFirst({ where: { id, restaurant_id: { in: ownerRestaurantIds } } });
    if (!existing) return next(new AppError("Booking not found", 404, "NOT_FOUND"));

    const schema = z.object({
      status:      z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]).optional(),
      tableNumber: z.number().int().optional(),
      date:        z.string().optional(),
      time:        z.string().optional(),
      partySize:   z.number().int().positive().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(new AppError("Invalid payload", 400, "VALIDATION_ERROR", parsed.error.issues));

    const { status, date, time, partySize } = parsed.data;
    const updateData: any = {};
    if (status)    updateData.status       = bookingStatusMap[status];
    if (date)      updateData.booking_date = new Date(date);
    if (time)      updateData.booking_time = time;
    if (partySize) updateData.party_size   = partySize;

    const booking = await prisma.booking.update({ where: { id }, data: updateData, include: bookingInclude });
    return res.json(successResponse("Booking updated", formatBooking(booking)));
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Restaurant Requests
// ─────────────────────────────────────────────────────────────────────────────

export const ownerListRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const owner  = await resolveOwner(req.user!.id);
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return next(new AppError("Invalid query", 400, "VALIDATION_ERROR"));
    const { page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      prisma.restaurantRequest.findMany({
        where:   { owner_id: owner.id },
        skip,
        take:    limit,
        orderBy: { created_at: "desc" },
        include: requestInclude,
      }),
      prisma.restaurantRequest.count({ where: { owner_id: owner.id } }),
    ]);

    return res.json(
      successResponse("Owner requests fetched", {
        data:       requests.map(formatRequest),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }),
    );
  } catch (err) {
    next(err);
  }
};

export const ownerCreateRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const owner = await resolveOwner(req.user!.id);

    // Block if a pending request already exists
    const pending = await prisma.restaurantRequest.findFirst({
      where: { owner_id: owner.id, status: "PENDING" },
    });
    if (pending) {
      return next(new AppError("You already have a pending request. Wait for admin review before submitting another.", 400, "PENDING_REQUEST_EXISTS"));
    }

    const schema = z.object({
      requestedCount: z.number().int().min(4, "Requested count must be at least 4"),
      reason:         z.string().min(30, "Please provide at least 30 characters"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(new AppError("Invalid payload", 400, "VALIDATION_ERROR", parsed.error.issues));

    const currentCount = await prisma.restaurant.count({ where: { owner_id: owner.id } });

    const request = await prisma.restaurantRequest.create({
      data: {
        owner_id:       owner.id,
        current_count:  currentCount,
        requested_count: parsed.data.requestedCount,
        reason:         parsed.data.reason,
        status:         "PENDING",
      },
      include: requestInclude,
    });

    return res.status(201).json(successResponse("Request submitted", formatRequest(request)));
  } catch (err) {
    next(err);
  }
};
