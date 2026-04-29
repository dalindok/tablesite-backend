import type { NextFunction, Response } from "express";
import { prisma } from "../util/prisma.ts";
import { AppError } from "../errors/AppError.ts";
import { successResponse } from "../util/helper.ts";
import {
  createBookingSchema,
  updateBookingStatusSchema,
  acceptBookingSchema,
  rejectBookingSchema,
  cancelBookingSchema,
  completeBookingSchema,
  customerBookingFilterSchema,
  restaurantBookingFilterSchema,
} from "../schemas/booking.schema.ts";
import type { AuthRequest } from "../middlewares/auth.middleware.ts";
import { BookingStatus, Role } from "../../generated/prisma/enums.ts";

// Create booking (customer or guest)
export const createBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const parseResult = createBookingSchema.safeParse(req.body);
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
    const {
      restaurant_id,
      booking_date,
      booking_time,
      party_size,
      occasion,
      special_requests,
      table_ids,
      first_name,
      last_name,
      phone,
      email,
    } = parseResult.data;

    // Verify restaurant exists and is active
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurant_id },
      include: { tables: true },
    });

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    }

    if (restaurant.status !== "ACTIVE") {
      return next(
        new AppError("Restaurant is not available", 403, "UNAVAILABLE"),
      );
    }

    // Get or create customer
    let customer;
    if (req.user && req.user.role === Role.CUSTOMER) {
      // Authenticated customer
      customer = await prisma.customer.findUnique({
        where: { user_id: req.user.id },
      });

      if (!customer) {
        return next(
          new AppError("Customer profile not found", 404, "NOT_FOUND"),
        );
      }
    } else {
      // Guest booking
      if (email) {
        // Check if user with this email exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
          include: { customer: true },
        });

        if (existingUser) {
          // Use existing customer if they have one
          if (existingUser.customer) {
            customer = existingUser.customer;
          } else {
            // Create customer profile for existing user
            customer = await prisma.customer.create({
              data: {
                user_id: existingUser.id,
              },
            });
          }
        } else {
          // Create new guest user
          const guestUser = await prisma.user.create({
            data: {
              email,
              password: "guest", // Temporary password
              first_name: first_name,
              last_name: last_name,
              phone: phone,
              role: Role.CUSTOMER,
              is_active: false, // Mark as inactive guest user
            },
          });

          customer = await prisma.customer.create({
            data: {
              user_id: guestUser.id,
            },
          });
        }
      } else {
        // No email provided - create anonymous guest
        const guestUser = await prisma.user.create({
          data: {
            email: `guest_${Date.now()}@temp.com`,
            password: "guest",
            first_name: first_name,
            last_name: last_name,
            phone: phone,
            role: Role.CUSTOMER,
            is_active: false,
          },
        });

        customer = await prisma.customer.create({
          data: {
            user_id: guestUser.id,
          },
        });
      }
    }

    // Validate booking date/time
    const bookingDateTime = new Date(`${booking_date}T${booking_time}`);
    if (bookingDateTime < new Date()) {
      return next(
        new AppError(
          "Booking date and time must be in the future",
          400,
          "INVALID_DATE",
        ),
      );
    }

    // Check restaurant operating hours
    const dayOfWeek = bookingDateTime
      .toLocaleDateString("en-US", {
        weekday: "long",
      })
      .toUpperCase();

    const operatingHour = await prisma.operatingHour.findUnique({
      where: {
        restaurant_id_day_of_week: {
          restaurant_id,
          day_of_week: dayOfWeek as any,
        },
      },
    });

    if (!operatingHour || operatingHour.is_closed) {
      return next(
        new AppError("Restaurant is closed on this day", 400, "CLOSED"),
      );
    }

    if (
      booking_time < operatingHour.open_time ||
      booking_time > operatingHour.close_time
    ) {
      return next(
        new AppError(
          "Booking time is outside operating hours",
          400,
          "OUTSIDE_HOURS",
        ),
      );
    }

    // Check table availability
    let selectedTableIds: number[] = [];
    if (table_ids && table_ids.length > 0) {
      // Validate tables exist and have capacity
      const tables = await prisma.table.findMany({
        where: {
          id: { in: table_ids },
          restaurant_id,
        },
      });

      if (tables.length !== table_ids.length) {
        return next(
          new AppError("Some tables do not exist", 404, "INVALID_TABLES"),
        );
      }

      const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
      if (totalCapacity < party_size) {
        return next(
          new AppError(
            `Selected tables capacity (${totalCapacity}) is less than party size (${party_size})`,
            400,
            "INSUFFICIENT_CAPACITY",
          ),
        );
      }

      selectedTableIds = tables.map((t) => t.id);
    } else {
      // Auto-select tables based on party size
      const tables = await prisma.table.findMany({
        where: { restaurant_id },
        orderBy: { capacity: "asc" },
      });

      let capacity = 0;
      for (const table of tables) {
        if (capacity >= party_size) break;
        selectedTableIds.push(table.id);
        capacity += table.capacity;
      }

      if (capacity < party_size) {
        return next(
          new AppError(
            "Restaurant does not have sufficient table capacity",
            400,
            "INSUFFICIENT_CAPACITY",
          ),
        );
      }
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        customer_id: customer.id,
        restaurant_id,
        booking_date: new Date(booking_date),
        booking_time,
        party_size,
        occasion: occasion || null,
        special_requests: special_requests || null,
        status: BookingStatus.PENDING,
        booking_tables: {
          createMany: {
            data: selectedTableIds.map((tableId) => ({
              table_id: tableId,
            })),
          },
        },
      },
      include: {
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
        restaurant: true,
        booking_tables: {
          include: { table: true },
        },
      },
    });

    // Format response
    const formattedBooking = {
      id: booking.id,
      reference_code: booking.reference_code,
      status: booking.status,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      party_size: booking.party_size,
      duration_minutes: booking.duration_minutes,
      special_requests: booking.special_requests,
      restaurant: {
        id: booking.restaurant.id,
        name: booking.restaurant.name,
        slug: booking.restaurant.slug,
      },
      tables: booking.booking_tables.map((bt) => ({
        id: bt.table.id,
        table_number: bt.table.table_number,
        capacity: bt.table.capacity,
      })),
      customer: {
        name: `${booking.customer.user.first_name} ${booking.customer.user.last_name}`,
        email: booking.customer.user.email,
        phone: booking.customer.user.phone,
      },
      created_at: booking.created_at,
    };

    return res
      .status(201)
      .json(successResponse("Booking created successfully", formattedBooking));
  } catch (error) {
    return next(error);
  }
};

// Get customer's bookings (with filters)
export const getCustomerBookings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  if (req.user.role !== Role.CUSTOMER) {
    return next(
      new AppError("Only customers can view their bookings", 403, "FORBIDDEN"),
    );
  }

  const parseResult = customerBookingFilterSchema.safeParse(req.query);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid filter parameters",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  try {
    const { status, booking_type, page, limit } = parseResult.data;
    const skip = (page - 1) * limit;

    // Get customer
    const customer = await prisma.customer.findUnique({
      where: { user_id: req.user.id },
    });

    if (!customer) {
      return next(new AppError("Customer profile not found", 404, "NOT_FOUND"));
    }

    // Build where clause
    const where: any = { customer_id: customer.id };

    if (status) {
      where.status = status;
    }

    if (booking_type === "history") {
      where.booking_date = { lte: new Date() };
    } else if (booking_type === "upcoming") {
      where.booking_date = { gte: new Date() };
    }

    // Get total count
    const total = await prisma.booking.count({ where });

    // Get bookings
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            cover_image_url: true,
          },
        },
        booking_tables: {
          include: { table: true },
        },
      },
      orderBy: { booking_date: "desc" },
      skip,
      take: limit,
    });

    // Format response
    const formattedBookings = bookings.map((booking) => ({
      id: booking.id,
      reference_code: booking.reference_code,
      status: booking.status,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      party_size: booking.party_size,
      duration_minutes: booking.duration_minutes,
      special_requests: booking.special_requests,
      restaurant: booking.restaurant,
      tables: booking.booking_tables.map((bt) => ({
        id: bt.table.id,
        table_number: bt.table.table_number,
        capacity: bt.table.capacity,
      })),
      created_at: booking.created_at,
    }));

    return res.json(
      successResponse("Customer bookings fetched successfully", {
        data: formattedBookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

// Get restaurant's bookings (admin/owner only)
export const getRestaurantBookings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  const parseResult = restaurantBookingFilterSchema.safeParse(req.query);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid filter parameters",
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

    // Verify authorization
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: Number(restaurant_id) },
      include: { owner: true },
    });

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    }

    if (
      req.user.role !== Role.ADMIN &&
      restaurant.owner.user_id !== req.user.id
    ) {
      return next(
        new AppError(
          "You don't have permission to view this restaurant's bookings",
          403,
          "FORBIDDEN",
        ),
      );
    }

    const {
      booking_id,
      status,
      customer_name,
      booking_date,
      date_from,
      date_to,
      page,
      limit,
    } = parseResult.data;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { restaurant_id: Number(restaurant_id) };

    if (booking_id) {
      where.id = booking_id;
    }

    if (status) {
      where.status = status;
    }

    if (booking_date) {
      const dateStart = new Date(booking_date);
      const dateEnd = new Date(booking_date);
      dateEnd.setDate(dateEnd.getDate() + 1);
      where.booking_date = {
        gte: dateStart,
        lt: dateEnd,
      };
    }

    if (date_from || date_to) {
      where.booking_date = {};
      if (date_from) where.booking_date.gte = new Date(date_from);
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setDate(endDate.getDate() + 1);
        where.booking_date.lt = endDate;
      }
    }

    // Get total count
    const total = await prisma.booking.count({ where });

    // Get bookings
    const bookings = await prisma.booking.findMany({
      where,
      include: {
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
          include: { table: true },
        },
      },
      orderBy: { booking_date: "desc" },
      skip,
      take: limit,
    });

    // Filter by customer name if provided
    let filteredBookings = bookings;
    if (customer_name) {
      filteredBookings = bookings.filter((booking) => {
        const fullName =
          `${booking.customer.user.first_name} ${booking.customer.user.last_name}`.toLowerCase();
        return fullName.includes(customer_name.toLowerCase());
      });
    }

    // Format response
    const formattedBookings = filteredBookings.map((booking) => ({
      id: booking.id,
      reference_code: booking.reference_code,
      status: booking.status,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      party_size: booking.party_size,
      duration_minutes: booking.duration_minutes,
      special_requests: booking.special_requests,
      customer: {
        name: `${booking.customer.user.first_name} ${booking.customer.user.last_name}`,
        email: booking.customer.user.email,
        phone: booking.customer.user.phone,
      },
      tables: booking.booking_tables.map((bt) => ({
        id: bt.table.id,
        table_number: bt.table.table_number,
        capacity: bt.table.capacity,
      })),
      created_at: booking.created_at,
    }));

    return res.json(
      successResponse("Restaurant bookings fetched successfully", {
        data: formattedBookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

// Get booking detail
export const getBookingDetail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  try {
    const { booking_id } = req.params;

    if (!booking_id || isNaN(Number(booking_id))) {
      return next(new AppError("Invalid booking ID", 400, "INVALID_ID"));
    }

    const booking = await prisma.booking.findUnique({
      where: { id: Number(booking_id) },
      include: {
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
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            cover_image_url: true,
            owner_id: true,
          },
          include: {
            owner: true,
          },
        },
        booking_tables: {
          include: { table: true },
        },
        payment: true,
        review: true,
      },
    });

    if (!booking) {
      return next(new AppError("Booking not found", 404, "NOT_FOUND"));
    }

    // Check authorization
    if (
      req.user.role === Role.CUSTOMER &&
      booking.customer.user_id !== req.user.id
    ) {
      return next(
        new AppError(
          "You don't have permission to view this booking",
          403,
          "FORBIDDEN",
        ),
      );
    }

    if (
      req.user.role === Role.OWNER &&
      booking.restaurant.owner.user_id !== req.user.id
    ) {
      return next(
        new AppError(
          "You don't have permission to view this booking",
          403,
          "FORBIDDEN",
        ),
      );
    }

    // Format response
    const formattedBooking = {
      id: booking.id,
      reference_code: booking.reference_code,
      status: booking.status,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      party_size: booking.party_size,
      duration_minutes: booking.duration_minutes,
      special_requests: booking.special_requests,
      internal_notes: booking.internal_notes,
      customer: {
        id: booking.customer.user.id,
        name: `${booking.customer.user.first_name} ${booking.customer.user.last_name}`,
        email: booking.customer.user.email,
        phone: booking.customer.user.phone,
      },
      restaurant: {
        id: booking.restaurant.id,
        name: booking.restaurant.name,
        slug: booking.restaurant.slug,
        cover_image_url: booking.restaurant.cover_image_url,
      },
      tables: booking.booking_tables.map((bt) => ({
        id: bt.table.id,
        table_number: bt.table.table_number,
        capacity: bt.table.capacity,
      })),
      payment: booking.payment
        ? {
            id: booking.payment.id,
            status: booking.payment.status,
            amount: booking.payment.amount,
          }
        : null,
      review: booking.review
        ? {
            id: booking.review.id,
            rating: booking.review.rating,
            comment: booking.review.comment,
          }
        : null,
      confirmed_at: booking.confirmed_at,
      cancelled_at: booking.cancelled_at,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
    };

    return res.json(
      successResponse("Booking detail fetched successfully", formattedBooking),
    );
  } catch (error) {
    return next(error);
  }
};

// Customer cancel booking
export const cancelBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  if (req.user.role !== Role.CUSTOMER) {
    return next(
      new AppError("Only customers can cancel bookings", 403, "FORBIDDEN"),
    );
  }

  const parseResult = cancelBookingSchema.safeParse(req.body);
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
    const { booking_id } = req.params;
    const { reason } = parseResult.data;

    if (!booking_id || isNaN(Number(booking_id))) {
      return next(new AppError("Invalid booking ID", 400, "INVALID_ID"));
    }

    const booking = await prisma.booking.findUnique({
      where: { id: Number(booking_id) },
      include: { customer: true },
    });

    if (!booking) {
      return next(new AppError("Booking not found", 404, "NOT_FOUND"));
    }

    // Verify customer owns this booking
    if (booking.customer.user_id !== req.user.id) {
      return next(
        new AppError(
          "You don't have permission to cancel this booking",
          403,
          "FORBIDDEN",
        ),
      );
    }

    // Can only cancel pending or confirmed bookings
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      return next(
        new AppError(
          `Cannot cancel booking with status: ${booking.status}`,
          400,
          "INVALID_STATUS",
        ),
      );
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: Number(booking_id) },
      data: {
        status: BookingStatus.CANCELLED,
        cancelled_at: new Date(),
        cancellation_reason: reason || null,
      },
    });

    return res.json(
      successResponse("Booking cancelled successfully", {
        id: updatedBooking.id,
        status: updatedBooking.status,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

// Accept booking (restaurant/admin only)
export const acceptBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  if (![Role.ADMIN, Role.OWNER].includes(req.user.role)) {
    return next(
      new AppError(
        "Only restaurant owners and admins can accept bookings",
        403,
        "FORBIDDEN",
      ),
    );
  }

  const parseResult = acceptBookingSchema.safeParse(req.body);
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
    const { booking_id } = req.params;
    const { table_ids } = parseResult.data;

    if (!booking_id || isNaN(Number(booking_id))) {
      return next(new AppError("Invalid booking ID", 400, "INVALID_ID"));
    }

    const booking = await prisma.booking.findUnique({
      where: { id: Number(booking_id) },
      include: {
        restaurant: { include: { owner: true } },
        booking_tables: true,
      },
    });

    if (!booking) {
      return next(new AppError("Booking not found", 404, "NOT_FOUND"));
    }

    // Verify authorization
    if (
      req.user.role === Role.OWNER &&
      booking.restaurant.owner.user_id !== req.user.id
    ) {
      return next(
        new AppError(
          "You don't have permission to accept this booking",
          403,
          "FORBIDDEN",
        ),
      );
    }

    // Can only accept pending bookings
    if (booking.status !== BookingStatus.PENDING) {
      return next(
        new AppError(
          `Cannot accept booking with status: ${booking.status}`,
          400,
          "INVALID_STATUS",
        ),
      );
    }

    // Update tables if provided
    if (table_ids && table_ids.length > 0) {
      // Delete existing booking tables
      await prisma.bookingTable.deleteMany({
        where: { booking_id: Number(booking_id) },
      });

      // Create new booking tables
      await prisma.bookingTable.createMany({
        data: table_ids.map((tableId) => ({
          booking_id: Number(booking_id),
          table_id: tableId,
        })),
      });
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: Number(booking_id) },
      data: {
        status: BookingStatus.CONFIRMED,
        confirmed_at: new Date(),
      },
      include: {
        booking_tables: { include: { table: true } },
      },
    });

    return res.json(
      successResponse("Booking accepted successfully", {
        id: updatedBooking.id,
        status: updatedBooking.status,
        confirmed_at: updatedBooking.confirmed_at,
        tables: updatedBooking.booking_tables.map((bt) => ({
          id: bt.table.id,
          table_number: bt.table.table_number,
        })),
      }),
    );
  } catch (error) {
    return next(error);
  }
};

// Reject booking (restaurant/admin only)
export const rejectBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  if (![Role.ADMIN, Role.OWNER].includes(req.user.role)) {
    return next(
      new AppError(
        "Only restaurant owners and admins can reject bookings",
        403,
        "FORBIDDEN",
      ),
    );
  }

  const parseResult = rejectBookingSchema.safeParse(req.body);
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
    const { booking_id } = req.params;
    const { reason } = parseResult.data;

    if (!booking_id || isNaN(Number(booking_id))) {
      return next(new AppError("Invalid booking ID", 400, "INVALID_ID"));
    }

    const booking = await prisma.booking.findUnique({
      where: { id: Number(booking_id) },
      include: { restaurant: { include: { owner: true } } },
    });

    if (!booking) {
      return next(new AppError("Booking not found", 404, "NOT_FOUND"));
    }

    // Verify authorization
    if (
      req.user.role === Role.OWNER &&
      booking.restaurant.owner.user_id !== req.user.id
    ) {
      return next(
        new AppError(
          "You don't have permission to reject this booking",
          403,
          "FORBIDDEN",
        ),
      );
    }

    // Can only reject pending bookings
    if (booking.status !== BookingStatus.PENDING) {
      return next(
        new AppError(
          `Cannot reject booking with status: ${booking.status}`,
          400,
          "INVALID_STATUS",
        ),
      );
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: Number(booking_id) },
      data: {
        status: BookingStatus.CANCELLED,
        cancelled_at: new Date(),
        cancellation_reason: reason || "Rejected by restaurant",
      },
    });

    return res.json(
      successResponse("Booking rejected successfully", {
        id: updatedBooking.id,
        status: updatedBooking.status,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

// Update booking status (admin/owner only)
export const updateBookingStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  if (![Role.ADMIN, Role.OWNER].includes(req.user.role)) {
    return next(
      new AppError(
        "Only restaurant owners and admins can update booking status",
        403,
        "FORBIDDEN",
      ),
    );
  }

  const parseResult = updateBookingStatusSchema.safeParse(req.body);
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
    const { booking_id } = req.params;
    const { status } = parseResult.data;

    if (!booking_id || isNaN(Number(booking_id))) {
      return next(new AppError("Invalid booking ID", 400, "INVALID_ID"));
    }

    const booking = await prisma.booking.findUnique({
      where: { id: Number(booking_id) },
      include: { restaurant: { include: { owner: true } } },
    });

    if (!booking) {
      return next(new AppError("Booking not found", 404, "NOT_FOUND"));
    }

    // Verify authorization
    if (
      req.user.role === Role.OWNER &&
      booking.restaurant.owner.user_id !== req.user.id
    ) {
      return next(
        new AppError(
          "You don't have permission to update this booking",
          403,
          "FORBIDDEN",
        ),
      );
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: Number(booking_id) },
      data: {
        status,
      },
    });

    return res.json(
      successResponse("Booking status updated successfully", {
        id: updatedBooking.id,
        status: updatedBooking.status,
      }),
    );
  } catch (error) {
    return next(error);
  }
};
