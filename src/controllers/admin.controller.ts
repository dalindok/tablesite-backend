import type { NextFunction, Response } from "express";
import { hashSync } from "bcrypt";
import { prisma } from "../util/prisma.ts";
import { AppError } from "../errors/AppError.ts";
import { successResponse, parseParamId } from "../util/helper.ts";
import type { AuthRequest } from "../middlewares/auth.middleware.ts";
import {
  Role,
  BookingStatus,
  RestaurantStatus,
} from "../../generated/prisma/enums.ts";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  search: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional(),
});

/** Map frontend status strings (lowercase) → DB enums */
const bookingStatusMap: Record<string, BookingStatus> = {
  pending: BookingStatus.PENDING,
  confirmed: BookingStatus.CONFIRMED,
  cancelled: BookingStatus.CANCELLED,
  completed: BookingStatus.COMPLETED,
  no_show: BookingStatus.NO_SHOW,
};

const restaurantStatusMap: Record<string, RestaurantStatus> = {
  pending: RestaurantStatus.PENDING_APPROVAL,
  active: RestaurantStatus.ACTIVE,
  inactive: RestaurantStatus.SUSPENDED,
  suspended: RestaurantStatus.SUSPENDED,
};

// Reverse map: DB enum → frontend status string
const restaurantStatusReverse: Record<string, string> = {
  PENDING_APPROVAL: "pending",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  CLOSED: "inactive",
};

const bookingStatusReverse: Record<string, string> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  NO_SHOW: "no_show",
};

function formatUser(u: any) {
  return {
    id: u.id,
    name: `${u.first_name} ${u.last_name}`.trim(),
    email: u.email,
    phone: u.phone ?? null,
    role: (u.role as string).toLowerCase(),
    status: u.is_active ? "active" : "inactive",
    createdAt: u.created_at,
    updatedAt: u.updated_at,
    restaurantCount: u.restaurant_owner?.restaurants?.length ?? undefined,
  };
}

function formatRestaurant(r: any) {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    address: r.address,
    city: r.city,
    state: r.state ?? null,
    country: r.country ?? null,
    postalCode: r.postal_code ?? null,
    phone: r.phone ?? "",
    email: r.email ?? "",
    website: r.website ?? null,
    coverImageUrl: r.cover_image_url ?? null,
    cuisineType: r.cuisine_type ?? "Other",
    priceRange: r.price_range ?? null,
    isPopular: r.is_popular ?? false,
    capacity: r.max_capacity ?? 0,
    minCapacity: r.min_capacity ?? 0,
    openingTime: r.operating_hours?.[0]?.open_time ?? "09:00",
    closingTime: r.operating_hours?.[0]?.close_time ?? "22:00",
    image: r.cover_image_url ?? null,
    status: restaurantStatusReverse[r.status] ?? "pending",
    ownerId: r.owner?.user?.id ?? r.owner_id,
    ownerName: r.owner?.user
      ? `${r.owner.user.first_name} ${r.owner.user.last_name}`.trim()
      : null,
    ownerEmail: r.owner?.user?.email ?? null,
    ownerPhone: r.owner?.user?.phone ?? null,
    rating: Number(r.average_rating),
    adminNote: r.admin_note ?? null,
    minBookingNotice: r.min_booking_notice ?? 60,
    maxBookingDays: r.max_booking_days ?? 30,
    cancellationHours: r.cancellation_hours ?? 24,
    depositRequired: r.deposit_required ?? false,
    depositAmount: r.deposit_amount ? Number(r.deposit_amount) : null,
    parkingAvailable: r.parking_available ?? false,
    dressCode: r.dress_code ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function formatBooking(b: any) {
  const tableNumber = b.booking_tables?.[0]?.table?.table_number
    ? b.booking_tables[0].table.table_number
    : undefined;

  // Contact details submitted at booking time (stored directly on the booking row)
  const contactName =
    [b.contact_customer_first_name, b.contact_customer_last_name]
      .filter(Boolean)
      .join(" ") || null;

  // Linked user account name (may differ from contact for guests)
  const bookingUserName = b.customer?.user
    ? `${b.customer.user.first_name ?? ""} ${b.customer.user.last_name ?? ""}`.trim() ||
      null
    : null;

  return {
    id: b.id,
    restaurantId: b.restaurant_id,
    restaurantName: b.restaurant?.name ?? null,
    customerId: b.customer_id,
    // Legacy — falls back gracefully for old rows without contact fields
    customerName: contactName ?? bookingUserName,
    customerEmail: b.contact_customer_email ?? b.customer?.user?.email ?? null,
    customerPhone: b.contact_customer_phone ?? b.customer?.user?.phone ?? null,
    // Contact customer (what they filled in the booking form)
    contactCustomerName: contactName,
    contactCustomerPhone: b.contact_customer_phone ?? null,
    contactCustomerEmail: b.contact_customer_email ?? null,
    // Linked account
    bookingUserName,
    date: b.booking_date,
    time: b.booking_time,
    partySize: b.party_size,
    status: bookingStatusReverse[b.status] ?? "pending",
    specialRequests: b.special_requests ?? null,
    tableNumber,
    createdDate: b.created_at,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
}

function formatRequest(r: any) {
  return {
    id: r.id,
    ownerId: r.owner?.user?.id ?? null,
    ownerName: r.owner?.user
      ? `${r.owner.user.first_name} ${r.owner.user.last_name}`.trim()
      : null,
    ownerEmail: r.owner?.user?.email ?? null,
    currentCount: r.current_count,
    requestedCount: r.requested_count,
    reason: r.reason,
    status: (r.status as string).toLowerCase(),
    adminNote: r.admin_note ?? null,
    reviewedBy: r.reviewed_by?.user
      ? `${r.reviewed_by.user.first_name} ${r.reviewed_by.user.last_name}`.trim()
      : null,
    reviewedAt: r.reviewed_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export const adminDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalUsers,
    totalOwners,
    totalCustomers,
    totalRestaurants,
    activeRestaurants,
    totalBookings,
    pendingBookings,
    confirmedBookings,
    todayBookings,
    pendingRequests,
    recentBookings,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { in: [Role.OWNER, Role.CUSTOMER] } } }),
    prisma.user.count({ where: { role: Role.OWNER } }),
    prisma.user.count({ where: { role: Role.CUSTOMER } }),
    prisma.restaurant.count(),
    prisma.restaurant.count({ where: { status: RestaurantStatus.ACTIVE } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
    prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
    prisma.booking.count({
      where: { booking_date: { gte: today, lt: tomorrow } },
    }),
    prisma.restaurantRequest.count({ where: { status: "PENDING" } }),
    prisma.booking.findMany({
      take: 10,
      orderBy: { created_at: "desc" },
      include: {
        restaurant: { select: { name: true } },
        customer: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        booking_tables: {
          include: { table: { select: { table_number: true } } },
        },
      },
    }),
  ]);

  return res.json(
    successResponse("Admin dashboard stats", {
      totalUsers,
      totalOwners,
      totalCustomers,
      totalRestaurants,
      activeRestaurants,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      todayBookings,
      pendingRequests,
      recentBookings: recentBookings.map(formatBooking),
    }),
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────

export const adminListUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success)
    return next(new AppError("Invalid query", 400, "VALIDATION_ERROR"));
  const { page, limit, search, role } = parsed.data;
  const skip = (page - 1) * limit;

  const where: any = {
    role: { not: Role.ADMIN },
  };
  if (search) {
    where.OR = [
      { first_name: { contains: search } },
      { last_name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }
  if (role) {
    where.role = (role as string).toUpperCase() as Role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        restaurant_owner: {
          include: { restaurants: { select: { id: true } } },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return res.json(
    successResponse("Users fetched", {
      data: users.map(formatUser),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }),
  );
};

export const adminGetUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const id = parseParamId(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      restaurant_owner: { include: { restaurants: { select: { id: true } } } },
    },
  });
  if (!user) return next(new AppError("User not found", 404, "NOT_FOUND"));
  return res.json(successResponse("User fetched", formatUser(user)));
};

export const adminCreateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    phone: z.string().optional(),
    role: z.enum(["customer", "owner", "admin"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return next(
      new AppError(
        "Invalid payload",
        400,
        "VALIDATION_ERROR",
        parsed.error.issues,
      ),
    );

  const { name, email, password, phone, role } = parsed.data;
  const [first_name, ...rest] = name.trim().split(" ");
  const last_name = rest.join(" ") || "";
  const dbRole = role.toUpperCase() as Role;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return next(
      new AppError("Email already in use", 409, "USER_ALREADY_EXISTS"),
    );

  const user = await prisma.user.create({
    data: {
      email,
      password: hashSync(password, 10),
      first_name,
      last_name,
      phone,
      role: dbRole,
      ...(dbRole === Role.OWNER && { restaurant_owner: { create: {} } }),
      ...(dbRole === Role.ADMIN && { admin: { create: {} } }),
      ...(dbRole === Role.CUSTOMER && { customer: { create: {} } }),
    },
    include: {
      restaurant_owner: { include: { restaurants: { select: { id: true } } } },
    },
  });

  return res
    .status(201)
    .json(successResponse("User created", formatUser(user)));
};

export const adminUpdateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const id = parseParamId(req.params.id);
  const schema = z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    role: z.enum(["customer", "owner", "admin"]).optional(),
    status: z.enum(["active", "inactive", "suspended"]).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return next(
      new AppError(
        "Invalid payload",
        400,
        "VALIDATION_ERROR",
        parsed.error.issues,
      ),
    );

  const { name, email, phone, role, status } = parsed.data;
  const updateData: any = {};
  if (name) {
    const [first_name, ...rest] = name.trim().split(" ");
    updateData.first_name = first_name;
    updateData.last_name = rest.join(" ") || "";
  }
  if (email) updateData.email = email;
  if (phone) updateData.phone = phone;
  if (role) updateData.role = role.toUpperCase() as Role;
  if (status) updateData.is_active = status === "active";

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    include: {
      restaurant_owner: { include: { restaurants: { select: { id: true } } } },
    },
  });

  return res.json(successResponse("User updated", formatUser(user)));
};

export const adminDeleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const id = parseParamId(req.params.id);
  await prisma.user.delete({ where: { id } });
  return res.json(successResponse("User deleted", {}));
};

export const adminUpdateUserStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const id = parseParamId(req.params.id);
  const schema = z.object({
    status: z.enum(["active", "inactive", "suspended"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return next(new AppError("Invalid status", 400, "VALIDATION_ERROR"));

  const is_active = parsed.data.status === "active";
  const user = await prisma.user.update({
    where: { id },
    data: { is_active },
    include: {
      restaurant_owner: { include: { restaurants: { select: { id: true } } } },
    },
  });

  return res.json(successResponse("User status updated", formatUser(user)));
};

// ─────────────────────────────────────────────────────────────────────────────
// Restaurants
// ─────────────────────────────────────────────────────────────────────────────

const restaurantInclude = {
  owner: {
    include: {
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
        },
      },
    },
  },
  operating_hours: {
    select: { open_time: true, close_time: true, day_of_week: true },
    take: 1,
  },
};

export const adminListRestaurants = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success)
    return next(new AppError("Invalid query", 400, "VALIDATION_ERROR"));
  const { page, limit, search, status } = parsed.data;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { city: { contains: search } },
      { cuisine_type: { contains: search } },
    ];
  }
  if (status) {
    const dbStatus = restaurantStatusMap[status.toLowerCase()];
    if (dbStatus) where.status = dbStatus;
  }

  const [restaurants, total] = await Promise.all([
    prisma.restaurant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: restaurantInclude,
    }),
    prisma.restaurant.count({ where }),
  ]);

  return res.json(
    successResponse("Restaurants fetched", {
      data: restaurants.map(formatRestaurant),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }),
  );
};

export const adminUpdateRestaurantStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const id = parseParamId(req.params.id);
  const schema = z.object({
    status: z.enum(["active", "inactive", "pending", "suspended"]),
    reason: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return next(new AppError("Invalid status", 400, "VALIDATION_ERROR"));

  const dbStatus =
    restaurantStatusMap[parsed.data.status] ??
    RestaurantStatus.PENDING_APPROVAL;
  const restaurant = await prisma.restaurant.update({
    where: { id },
    data: {
      status: dbStatus,
      ...(parsed.data.reason !== undefined && {
        admin_note: parsed.data.reason,
      }),
    },
    include: restaurantInclude,
  });

  return res.json(
    successResponse("Restaurant status updated", formatRestaurant(restaurant)),
  );
};

export const adminUpdateRestaurant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const id = parseParamId(req.params.id);
  const schema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    cuisineType: z.string().optional(),
    capacity: z.number().int().positive().optional(),
    status: z.enum(["active", "inactive", "pending", "suspended"]).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return next(
      new AppError(
        "Invalid payload",
        400,
        "VALIDATION_ERROR",
        parsed.error.issues,
      ),
    );

  const { cuisineType, capacity, status, ...rest } = parsed.data;
  const updateData: any = { ...rest };
  if (cuisineType) updateData.cuisine_type = cuisineType;
  if (capacity) updateData.max_capacity = capacity;
  if (status)
    updateData.status =
      restaurantStatusMap[status] ?? RestaurantStatus.PENDING_APPROVAL;

  const restaurant = await prisma.restaurant.update({
    where: { id },
    data: updateData,
    include: restaurantInclude,
  });

  return res.json(
    successResponse("Restaurant updated", formatRestaurant(restaurant)),
  );
};

export const adminDeleteRestaurant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const id = parseParamId(req.params.id);
  await prisma.restaurant.delete({ where: { id } });
  return res.json(successResponse("Restaurant deleted", {}));
};

// ─────────────────────────────────────────────────────────────────────────────
// Bookings
// ─────────────────────────────────────────────────────────────────────────────

const bookingInclude = {
  restaurant: { select: { id: true, name: true } },
  customer: {
    include: {
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
        },
      },
    },
  },
  booking_tables: { include: { table: { select: { table_number: true } } } },
};

export const adminListBookings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success)
    return next(new AppError("Invalid query", 400, "VALIDATION_ERROR"));
  const { page, limit, search, status } = parsed.data;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { restaurant: { name: { contains: search } } },
      { customer: { user: { first_name: { contains: search } } } },
      { customer: { user: { last_name: { contains: search } } } },
      { customer: { user: { email: { contains: search } } } },
    ];
  }
  if (status) {
    const dbStatus = bookingStatusMap[status.toLowerCase()];
    if (dbStatus) where.status = dbStatus;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: bookingInclude,
    }),
    prisma.booking.count({ where }),
  ]);

  return res.json(
    successResponse("Bookings fetched", {
      data: bookings.map(formatBooking),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }),
  );
};

export const adminGetBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const id = parseParamId(req.params.id);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });
  if (!booking)
    return next(new AppError("Booking not found", 404, "NOT_FOUND"));
  return res.json(successResponse("Booking fetched", formatBooking(booking)));
};

export const adminUpdateBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const id = parseParamId(req.params.id);
  const schema = z.object({
    status: z
      .enum(["pending", "confirmed", "cancelled", "completed", "no_show"])
      .optional(),
    tableNumber: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    partySize: z.number().int().positive().optional(),
    cancellationReason: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return next(
      new AppError(
        "Invalid payload",
        400,
        "VALIDATION_ERROR",
        parsed.error.issues,
      ),
    );

  const { status, date, time, partySize, cancellationReason } = parsed.data;
  const updateData: any = {};
  if (status) updateData.status = bookingStatusMap[status];
  if (date) updateData.booking_date = new Date(date);
  if (time) updateData.booking_time = time;
  if (partySize) updateData.party_size = partySize;
  if (status === "cancelled" && cancellationReason)
    updateData.cancellation_reason = cancellationReason;

  const booking = await prisma.booking.update({
    where: { id },
    data: updateData,
    include: bookingInclude,
  });
  return res.json(successResponse("Booking updated", formatBooking(booking)));
};

export const adminDeleteBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const id = parseParamId(req.params.id);
  await prisma.booking.delete({ where: { id } });
  return res.json(successResponse("Booking deleted", {}));
};

// ─────────────────────────────────────────────────────────────────────────────
// Restaurant Requests
// ─────────────────────────────────────────────────────────────────────────────

const requestInclude = {
  owner: {
    include: {
      user: {
        select: { id: true, first_name: true, last_name: true, email: true },
      },
    },
  },
  reviewed_by: {
    include: { user: { select: { first_name: true, last_name: true } } },
  },
};

export const adminListRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success)
    return next(new AppError("Invalid query", 400, "VALIDATION_ERROR"));
  const { page, limit, search, status } = parsed.data;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.owner = {
      user: {
        OR: [
          { first_name: { contains: search } },
          { last_name: { contains: search } },
          { email: { contains: search } },
        ],
      },
    };
  }
  if (status) where.status = status.toUpperCase();

  const [requests, total] = await Promise.all([
    prisma.restaurantRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: requestInclude,
    }),
    prisma.restaurantRequest.count({ where }),
  ]);

  return res.json(
    successResponse("Requests fetched", {
      data: requests.map(formatRequest),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }),
  );
};

export const adminReviewRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const id = parseParamId(req.params.id);
  const schema = z.object({
    status: z.enum(["approved", "rejected"]),
    adminNote: z.string().min(1, "Note is required"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return next(
      new AppError(
        "Invalid payload",
        400,
        "VALIDATION_ERROR",
        parsed.error.issues,
      ),
    );

  // Resolve the Admin record for the current user
  const adminRecord = await prisma.admin.findUnique({
    where: { user_id: req.user!.id },
  });
  if (!adminRecord)
    return next(new AppError("Admin record not found", 403, "FORBIDDEN"));

  const restaurantRequest = await prisma.restaurantRequest.findUnique({
    where: { id },
    include: requestInclude,
  });
  if (!restaurantRequest)
    return next(new AppError("Request not found", 404, "NOT_FOUND"));
  if (restaurantRequest.status !== "PENDING") {
    return next(
      new AppError("Request already reviewed", 400, "ALREADY_REVIEWED"),
    );
  }

  const updated = await prisma.restaurantRequest.update({
    where: { id },
    data: {
      status: parsed.data.status.toUpperCase() as any,
      admin_note: parsed.data.adminNote,
      reviewed_by_id: adminRecord.id,
      reviewed_at: new Date(),
    },
    include: requestInclude,
  });

  return res.json(successResponse("Request reviewed", formatRequest(updated)));
};
