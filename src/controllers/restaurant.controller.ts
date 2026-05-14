import type { NextFunction, Response } from "express";
import { prisma } from "../util/prisma.ts";
import { AppError } from "../errors/AppError.ts";
import { successResponse } from "../util/helper.ts";
import { createRestaurantRelatedRecords } from "../util/restaurant-importer.ts";
import {
  restaurantListSearchSchema,
  addFavoriteSchema,
  createRestaurantSchema,
  updateRestaurantSchema,
  deleteRestaurantSchema,
  updateRestaurantStatusSchema,
  restaurantFileImportSchema,
} from "../schemas/restaurant.schema.ts";
import type { AuthRequest } from "../middlewares/auth.middleware.ts";
import { RestaurantStatus, Role } from "../../generated/prisma/enums.ts";

// List all restaurants with search filters
export const listRestaurants = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const parseResult = restaurantListSearchSchema.safeParse(req.query);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid search query",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  try {
    const {
      search,
      cuisine,
      location,
      date,
      minPrice,
      maxPrice,
      priceRate,
      sortBy,
      page,
      limit,
      guestCount,
      minCapacity,
    } = parseResult.data;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      status: RestaurantStatus.ACTIVE,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { cuisine_type: { contains: search } },
      ];
    }

    if (cuisine) {
      where.cuisine_type = { contains: cuisine };
    }

    if (location) {
      where.OR = where.OR || [];
      where.OR.push(
        { city: { contains: location } },
        { address: { contains: location } },
      );
    }

    // Guest count filter - check restaurant capacity
    if (guestCount) {
      where.max_capacity = { gte: guestCount };
    }

    if (minCapacity) {
      where.min_capacity = { lte: minCapacity };
    }

    // Price range filter
    if (priceRate) {
      const priceRangeMap: { [key: string]: string } = {
        low: "LOW",
        medium: "MEDIUM",
        high: "HIGH",
      };
      where.price_range = priceRangeMap[priceRate] as any;
    }

    // Build order by
    let orderBy: any = { created_at: "desc" };
    if (sortBy === "rated") {
      orderBy = { average_rating: "desc" };
    } else if (sortBy === "popular") {
      // Filter to show only popular restaurants
      where.is_popular = true;
      orderBy = [{ total_reviews: "desc" }, { average_rating: "desc" }];
    } else if (sortBy === "top") {
      // Top restaurants by popularity, average rating, and total reviews
      where.is_popular = true;
      orderBy = [{ average_rating: "desc" }, { total_reviews: "desc" }];
    } else if (sortBy === "newest") {
      orderBy = { created_at: "desc" };
    }

    // Get total count
    const total = await prisma.restaurant.count({ where });

    // Get restaurants with relations
    const restaurants = await prisma.restaurant.findMany({
      where,
      include: {
        owner: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
          },
        },
        tags: {
          include: { tag: true },
        },
        amenities: {
          include: { amenity: true },
        },
        gallery_images: {
          take: 5,
          orderBy: { sort_order: "asc" },
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    // Transform response
    const data = restaurants.map((restaurant: any) => ({
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      description: restaurant.description,
      cuisine_type: restaurant.cuisine_type,
      address: restaurant.address,
      city: restaurant.city,
      state: restaurant.state,
      country: restaurant.country,
      phone: restaurant.phone,
      email: restaurant.email,
      website: restaurant.website,
      cover_image_url: restaurant.cover_image_url,
      average_rating: restaurant.average_rating,
      total_reviews: restaurant.total_reviews,
      max_capacity: restaurant.max_capacity,
      min_capacity: restaurant.min_capacity,
      price_range: restaurant.price_range,
      is_popular: restaurant.is_popular,
      gallery_images: restaurant.gallery_images,
      tags: restaurant.tags.map((rt: any) => rt.tag),
      amenities: restaurant.amenities.map((ra: any) => ra.amenity),
      owner: {
        id: restaurant.owner.id,
        user: restaurant.owner.user,
      },
      stats: {
        total_bookings: restaurant._count.bookings,
        total_reviews: restaurant._count.reviews,
      },
      created_at: restaurant.created_at,
    }));

    return res.json(
      successResponse("Restaurants fetched successfully", {
        data,
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

// Get restaurant detail
export const getRestaurantDetail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return next(new AppError("Invalid restaurant ID", 400, "INVALID_ID"));
    }

    const restaurant = (await prisma.restaurant.findUnique({
      where: { id: Number(id) },
      include: {
        owner: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
          },
        },
        tables: {
          include: {
            booking_tables: true,
          },
        },
        operating_hours: {
          orderBy: { day_of_week: "asc" },
        },
        special_closures: {
          where: {
            date: {
              gte: new Date(),
            },
          },
          orderBy: { date: "asc" },
        },
        reviews: {
          include: {
            customer: {
              include: {
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                    avatar_url: true,
                  },
                },
              },
            },
          },
          orderBy: { created_at: "desc" },
          take: 10,
        },
        tags: {
          include: { tag: true },
        },
        amenities: {
          include: { amenity: true },
        },
        gallery_images: {
          orderBy: { sort_order: "asc" },
        },
        menus: {
          include: {
            items: {
              orderBy: { sort_order: "asc" },
            },
          },
          orderBy: { created_at: "asc" },
        },
        favourited_by: {
          where: req.user
            ? { customer: { user_id: req.user.id } }
            : { customer: { user_id: -1 } },
        },
      },
    })) as any;

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    }

    if (restaurant.status !== RestaurantStatus.ACTIVE) {
      return next(
        new AppError("Restaurant is not available", 403, "UNAVAILABLE"),
      );
    }

    const data = {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      description: restaurant.description,
      cuisine_type: restaurant.cuisine_type,
      address: restaurant.address,
      city: restaurant.city,
      state: restaurant.state,
      country: restaurant.country,
      postal_code: restaurant.postal_code,
      phone: restaurant.phone,
      email: restaurant.email,
      website: restaurant.website,
      cover_image_url: restaurant.cover_image_url,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      average_rating: restaurant.average_rating,
      total_reviews: restaurant.total_reviews,
      max_capacity: restaurant.max_capacity,
      min_capacity: restaurant.min_capacity,
      price_range: restaurant.price_range,
      is_popular: restaurant.is_popular,
      gallery_images: restaurant.gallery_images,
      menus: restaurant.menus,
      tables: restaurant.tables,
      tags: restaurant.tags.map((rt: any) => rt.tag),
      amenities: restaurant.amenities.map((ra: any) => ra.amenity),
      owner: {
        id: restaurant.owner.id,
        user: restaurant.owner.user,
      },
      operating_hours: restaurant.operating_hours,
      special_closures: restaurant.special_closures,
      policies: {
        min_booking_notice: restaurant.min_booking_notice,
        max_booking_days: restaurant.max_booking_days,
        cancellation_hours: restaurant.cancellation_hours,
        deposit_required: restaurant.deposit_required,
        deposit_amount: restaurant.deposit_amount,
      },
      table_statistics: {
        total_tables: restaurant.tables.length,
        available_tables: restaurant.tables.filter(
          (t: any) => t.booking_tables.length === 0,
        ).length,
      },
      recent_reviews: restaurant.reviews.map((review: any) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        customer: {
          name: `${review.customer.user.first_name} ${review.customer.user.last_name}`,
          avatar_url: review.customer.user.avatar_url,
        },
        created_at: review.created_at,
      })),
      is_favorited: req.user ? restaurant.favourited_by.length > 0 : false,
      created_at: restaurant.created_at,
      updated_at: restaurant.updated_at,
    };

    return res.json(
      successResponse("Restaurant detail fetched successfully", data),
    );
  } catch (error) {
    return next(error);
  }
};

// Toggle restaurant favorite status
export const toggleFavorite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  const parseResult = addFavoriteSchema.safeParse(req.body);
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
    const { restaurant_id } = parseResult.data;

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurant_id },
    });

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    }

    // Get customer
    const customer = await prisma.customer.findUnique({
      where: { user_id: req.user.id },
    });

    if (!customer) {
      return next(new AppError("Customer profile not found", 404, "NOT_FOUND"));
    }

    // Check if already favorited
    const existing = await prisma.favouriteRestaurant.findUnique({
      where: {
        customer_id_restaurant_id: {
          customer_id: customer.id,
          restaurant_id,
        },
      },
    });

    if (existing) {
      // Remove from favorites
      await prisma.favouriteRestaurant.delete({
        where: {
          customer_id_restaurant_id: {
            customer_id: customer.id,
            restaurant_id,
          },
        },
      });

      return res.json(successResponse("Restaurant removed from favorites"));
    } else {
      // Add to favorites
      await prisma.favouriteRestaurant.create({
        data: {
          customer_id: customer.id,
          restaurant_id,
        },
      });

      return res.json(successResponse("Restaurant added to favorites"));
    }
  } catch (error) {
    return next(error);
  }
};

// Get user's favorite restaurants
export const getFavorites = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    // Get customer
    const customer = await prisma.customer.findUnique({
      where: { user_id: req.user.id },
    });

    if (!customer) {
      return next(new AppError("Customer profile not found", 404, "NOT_FOUND"));
    }

    // Get total count
    const total = await prisma.favouriteRestaurant.count({
      where: { customer_id: customer.id },
    });

    // Get favorites
    const favorites = await prisma.favouriteRestaurant.findMany({
      where: { customer_id: customer.id },
      include: {
        restaurant: {
          include: {
            owner: {
              include: {
                user: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
            tags: {
              include: { tag: true },
            },
            amenities: {
              include: { amenity: true },
            },
            gallery_images: {
              take: 3,
              orderBy: { sort_order: "asc" },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });

    const data = favorites.map((fav: any) => ({
      id: fav.restaurant.id,
      name: fav.restaurant.name,
      slug: fav.restaurant.slug,
      description: fav.restaurant.description,
      cuisine_type: fav.restaurant.cuisine_type,
      address: fav.restaurant.address,
      city: fav.restaurant.city,
      cover_image_url: fav.restaurant.cover_image_url,
      average_rating: fav.restaurant.average_rating,
      total_reviews: fav.restaurant.total_reviews,
      price_range: fav.restaurant.price_range,
      is_popular: fav.restaurant.is_popular,
      gallery_images: fav.restaurant.gallery_images,
      tags: fav.restaurant.tags.map((rt: any) => rt.tag),
      amenities: fav.restaurant.amenities.map((ra: any) => ra.amenity),
      owner: {
        id: fav.restaurant.owner.id,
        user: fav.restaurant.owner.user,
      },
      favorited_at: fav.created_at,
    }));

    return res.json(
      successResponse("Favorite restaurants fetched successfully", {
        data,
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

// Parse CSV content to array of records
const parseCSV = (csvContent: string): Record<string, any>[] => {
  const lines = csvContent.trim().replace(/\r\n/g, "\n").split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const records: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(",").map((v) => v.trim());
    const record: Record<string, any> = {};

    headers.forEach((header, index) => {
      record[header] = values[index] || null;
    });

    records.push(record);
  }

  return records;
};

// Import restaurants from uploaded file
export const importRestaurantsFromFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  if (req.user.role !== Role.ADMIN) {
    return next(
      new AppError("Only admins can import restaurants", 403, "FORBIDDEN"),
    );
  }

  try {
    const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
    let fileName = req.body.fileName as string | undefined;
    let fileContent = req.body.fileContent as string | undefined;

    if (file) {
      fileName = file.originalname;
      fileContent = file.buffer.toString("utf-8");
    }

    if (!fileContent || !fileName) {
      return next(
        new AppError("Missing file field in formdata", 400, "INVALID_REQUEST"),
      );
    }

    let parsedData: Record<string, any>[];

    // Parse based on file extension
    if (fileName.toLowerCase().endsWith(".json")) {
      parsedData = JSON.parse(fileContent);
    } else if (fileName.toLowerCase().endsWith(".csv")) {
      parsedData = parseCSV(fileContent);
    } else {
      return next(
        new AppError(
          "Unsupported file format. Use JSON or CSV",
          400,
          "INVALID_FORMAT",
        ),
      );
    }

    // Validate parsed data
    const validationResult = restaurantFileImportSchema.safeParse(parsedData);
    if (!validationResult.success) {
      return next(
        new AppError(
          "Invalid restaurant data in file",
          400,
          "VALIDATION_ERROR",
          validationResult.error.issues,
        ),
      );
    }

    // Get admin owner (will assign all restaurants to this admin)
    // In a real scenario, you might want to let the user specify an owner
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!adminUser) {
      return next(new AppError("Admin user not found", 404, "NOT_FOUND"));
    }

    // Create a default owner if needed or use first restaurant owner from data
    let ownerId: number;
    const existingOwner = await prisma.restaurantOwner.findUnique({
      where: { user_id: req.user.id },
    });

    if (!existingOwner) {
      // Create a restaurant owner for this admin
      const ownerUser = await prisma.user.create({
        data: {
          email: `owner-${Date.now()}@tablesite.com`,
          password: "temp-password",
          first_name: "Restaurant",
          last_name: "Owner",
          role: Role.OWNER,
        },
      });

      const owner = await prisma.restaurantOwner.create({
        data: {
          user_id: ownerUser.id,
        },
      });

      ownerId = owner.id;
    } else {
      ownerId = existingOwner.id;
    }

    // Import restaurants
    const importedRestaurants = [];
    const errors = [];

    for (let i = 0; i < validationResult.data.length; i++) {
      try {
        const restaurantData = validationResult.data[i];

        // Generate slug from name if not provided
        const slug =
          restaurantData.slug ||
          restaurantData.name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\w-]/g, "");

        // Check if slug already exists
        const existingRestaurant = await prisma.restaurant.findUnique({
          where: { slug },
        });

        if (existingRestaurant) {
          errors.push({
            row: i + 2,
            error: `Restaurant with slug "${slug}" already exists`,
          });
          continue;
        }

        const restaurant = await prisma.restaurant.create({
          data: {
            owner_id: ownerId,
            name: restaurantData.name,
            slug,
            description: restaurantData.description || null,
            cuisine_type: restaurantData.cuisine_type || null,
            address: restaurantData.address,
            city: restaurantData.city,
            state: restaurantData.state || null,
            country: restaurantData.country,
            postal_code: restaurantData.postal_code || null,
            phone: restaurantData.phone || null,
            email: restaurantData.email || null,
            website: restaurantData.website || null,
            cover_image_url: restaurantData.cover_image_url || null,
            latitude: restaurantData.latitude
              ? parseFloat(restaurantData.latitude)
              : null,
            longitude: restaurantData.longitude
              ? parseFloat(restaurantData.longitude)
              : null,
            max_capacity: restaurantData.max_capacity || null,
            min_capacity: restaurantData.min_capacity || null,
            parking_available: restaurantData.parking_available || false,
            dress_code: restaurantData.dress_code || null,
            price_range: restaurantData.price_range || null,
            is_popular: Boolean(restaurantData.is_popular),
            min_booking_notice: restaurantData.min_booking_notice || 60,
            max_booking_days: restaurantData.max_booking_days || 30,
            cancellation_hours: restaurantData.cancellation_hours || 24,
            deposit_required: restaurantData.deposit_required || false,
            deposit_amount: restaurantData.deposit_amount || null,
            status: RestaurantStatus.ACTIVE,
          },
        });

        // Create related restaurant records
        try {
          await createRestaurantRelatedRecords(restaurant.id, restaurantData);
        } catch (relationError: any) {
          errors.push({
            row: i + 2,
            error: `Failed to create restaurant relations: ${relationError.message}`,
          });
          continue;
        }

        importedRestaurants.push({
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
        });
      } catch (error: any) {
        errors.push({
          row: i + 2,
          error: error.message || "Failed to import restaurant",
        });
      }
    }

    return res.json(
      successResponse("Restaurants imported successfully", {
        imported: importedRestaurants.length,
        total: validationResult.data.length,
        restaurants: importedRestaurants,
        errors: errors.length > 0 ? errors : undefined,
      }),
    );
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      return next(new AppError("Invalid JSON format", 400, "INVALID_JSON"));
    }
    return next(error);
  }
};

// Create single restaurant (admin only)
export const createRestaurant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  if (req.user.role !== Role.ADMIN) {
    return next(
      new AppError("Only admins can create restaurants", 403, "FORBIDDEN"),
    );
  }

  const parseResult = createRestaurantSchema.safeParse(req.body);
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
    const data = parseResult.data;

    // Generate slug from name if not provided
    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "");

    // Check if slug already exists
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { slug },
    });

    if (existingRestaurant) {
      return next(
        new AppError(
          `Restaurant with slug "${slug}" already exists`,
          400,
          "DUPLICATE_SLUG",
        ),
      );
    }

    // Get or create owner
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!adminUser) {
      return next(new AppError("Admin user not found", 404, "NOT_FOUND"));
    }

    let ownerId: number;
    const existingOwner = await prisma.restaurantOwner.findUnique({
      where: { user_id: req.user.id },
    });

    if (!existingOwner) {
      const ownerUser = await prisma.user.create({
        data: {
          email: `owner-${Date.now()}@tablesite.com`,
          password: "temp-password",
          first_name: "Restaurant",
          last_name: "Owner",
          role: Role.OWNER,
        },
      });

      const owner = await prisma.restaurantOwner.create({
        data: {
          user_id: ownerUser.id,
        },
      });

      ownerId = owner.id;
    } else {
      ownerId = existingOwner.id;
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        owner_id: ownerId,
        name: data.name,
        slug,
        description: data.description || null,
        cuisine_type: data.cuisine_type || null,
        address: data.address,
        city: data.city,
        state: data.state || null,
        country: data.country,
        postal_code: data.postal_code || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        cover_image_url: data.cover_image_url || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        min_booking_notice: data.min_booking_notice || 60,
        max_booking_days: data.max_booking_days || 30,
        cancellation_hours: data.cancellation_hours || 24,
        deposit_required: data.deposit_required || false,
        deposit_amount: data.deposit_amount || null,
        price_range: data.price_range || null,
        is_popular: data.is_popular ?? false,
        status: RestaurantStatus.PENDING_APPROVAL,
      },
      include: {
        owner: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json(
      successResponse("Restaurant created successfully", {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        status: restaurant.status,
        is_popular: restaurant.is_popular,
        owner: restaurant.owner,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

// Update restaurant (owner or admin)
export const updateRestaurant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  const parseResult = updateRestaurantSchema.safeParse(req.body);
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
    const { id, ...updateData } = parseResult.data;

    // Get restaurant
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    }

    // Check authorization (owner or admin)
    if (
      req.user.role !== Role.ADMIN &&
      (req.user.role !== Role.OWNER || restaurant.owner.user_id !== req.user.id)
    ) {
      return next(
        new AppError(
          "Not authorized to update this restaurant",
          403,
          "FORBIDDEN",
        ),
      );
    }

    // Check if new slug conflicts with existing
    if (updateData.slug && updateData.slug !== restaurant.slug) {
      const existingSlug = await prisma.restaurant.findUnique({
        where: { slug: updateData.slug },
      });

      if (existingSlug) {
        return next(
          new AppError(
            `Restaurant with slug "${updateData.slug}" already exists`,
            400,
            "DUPLICATE_SLUG",
          ),
        );
      }
    }

    // Prepare update data
    const dataToUpdate: any = { ...updateData };

    // Parse latitude/longitude if provided
    if (updateData.latitude) {
      dataToUpdate.latitude = parseFloat(updateData.latitude);
    }
    if (updateData.longitude) {
      dataToUpdate.longitude = parseFloat(updateData.longitude);
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: dataToUpdate,
      include: {
        owner: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
    });

    return res.json(
      successResponse("Restaurant updated successfully", {
        id: updatedRestaurant.id,
        name: updatedRestaurant.name,
        slug: updatedRestaurant.slug,
        status: updatedRestaurant.status,
        is_popular: updatedRestaurant.is_popular,
        owner: updatedRestaurant.owner,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

// Update restaurant status (admin only)
export const updateRestaurantStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  if (req.user.role !== Role.ADMIN) {
    return next(
      new AppError(
        "Only admins can update restaurant status",
        403,
        "FORBIDDEN",
      ),
    );
  }

  const parseResult = updateRestaurantStatusSchema.safeParse(req.body);
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
    const { id, status } = parseResult.data;

    // Get restaurant
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: { status: status as RestaurantStatus },
      include: {
        owner: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
    });

    return res.json(
      successResponse("Restaurant status updated successfully", {
        id: updatedRestaurant.id,
        name: updatedRestaurant.name,
        slug: updatedRestaurant.slug,
        status: updatedRestaurant.status,
        owner: updatedRestaurant.owner,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

// Delete restaurant (owner or admin)
export const deleteRestaurant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  const parseResult = deleteRestaurantSchema.safeParse(req.body);
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
    const { id } = parseResult.data;

    // Get restaurant
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404, "NOT_FOUND"));
    }

    // Check authorization (owner or admin)
    if (
      req.user.role !== Role.ADMIN &&
      (req.user.role !== Role.OWNER || restaurant.owner.user_id !== req.user.id)
    ) {
      return next(
        new AppError(
          "Not authorized to delete this restaurant",
          403,
          "FORBIDDEN",
        ),
      );
    }

    // Hard delete the restaurant
    await prisma.restaurant.delete({
      where: { id },
    });

    return res.json(successResponse("Restaurant deleted successfully"));
  } catch (error) {
    return next(error);
  }
};

// Delete all restaurants and all related restaurant data
export const deleteAllRestaurants = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
  }

  if (req.user.role !== Role.ADMIN) {
    return next(
      new AppError("Only admins can delete all restaurants", 403, "FORBIDDEN"),
    );
  }

  try {
    const restaurantIds = (
      await prisma.restaurant.findMany({ select: { id: true } })
    ).map((restaurant) => restaurant.id);

    if (!restaurantIds.length) {
      return res.json(
        successResponse("No restaurants found to delete", { deleted: 0 }),
      );
    }

    await prisma.$transaction([
      prisma.favouriteRestaurant.deleteMany({
        where: { restaurant_id: { in: restaurantIds } },
      }),
      prisma.restaurantTag.deleteMany({
        where: { restaurant_id: { in: restaurantIds } },
      }),
      prisma.restaurantAmenity.deleteMany({
        where: { restaurant_id: { in: restaurantIds } },
      }),
      prisma.restaurantImage.deleteMany({
        where: { restaurant_id: { in: restaurantIds } },
      }),
      prisma.specialClosure.deleteMany({
        where: { restaurant_id: { in: restaurantIds } },
      }),
      prisma.operatingHour.deleteMany({
        where: { restaurant_id: { in: restaurantIds } },
      }),
      prisma.menuItem.deleteMany({
        where: { menu: { restaurant_id: { in: restaurantIds } } },
      }),
      prisma.menu.deleteMany({
        where: { restaurant_id: { in: restaurantIds } },
      }),
      prisma.review.deleteMany({
        where: { restaurant_id: { in: restaurantIds } },
      }),
      prisma.payment.deleteMany({
        where: { booking: { restaurant_id: { in: restaurantIds } } },
      }),
      prisma.booking.deleteMany({
        where: { restaurant_id: { in: restaurantIds } },
      }),
      prisma.table.deleteMany({
        where: { restaurant_id: { in: restaurantIds } },
      }),
      prisma.restaurantApproval.deleteMany({
        where: { restaurant_id: { in: restaurantIds } },
      }),
      prisma.restaurant.deleteMany({
        where: { id: { in: restaurantIds } },
      }),
    ]);

    return res.json(
      successResponse("All restaurants and related data deleted successfully", {
        deleted: restaurantIds.length,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

// List addresses (cities/states) with total restaurants
export const listAddressesWithRestaurantCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get all active restaurants
    const restaurants = await prisma.restaurant.findMany({
      where: {
        status: RestaurantStatus.ACTIVE,
      },
      select: {
        city: true,
        state: true,
      },
    });

    // Group by city
    const cityCounts: { [key: string]: number } = {};
    const stateCounts: { [key: string]: number } = {};

    restaurants.forEach((restaurant) => {
      if (restaurant.city) {
        cityCounts[restaurant.city] = (cityCounts[restaurant.city] || 0) + 1;
      }
      if (restaurant.state) {
        stateCounts[restaurant.state] =
          (stateCounts[restaurant.state] || 0) + 1;
      }
    });

    const cities = Object.entries(cityCounts)
      .map(([address, total_restaurants]) => ({
        address,
        type: "city" as const,
        total_restaurants,
      }))
      .sort((a, b) => b.total_restaurants - a.total_restaurants);

    const states = Object.entries(stateCounts)
      .map(([address, total_restaurants]) => ({
        address,
        type: "state" as const,
        total_restaurants,
      }))
      .sort((a, b) => b.total_restaurants - a.total_restaurants);

    const data = {
      cities,
      states,
    };

    return res.json(successResponse("Addresses retrieved successfully", data));
  } catch (error) {
    return next(error);
  }
};

// List cuisines with total restaurants
export const listCuisinesWithRestaurantCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get all active restaurants
    const restaurants = await prisma.restaurant.findMany({
      where: {
        status: RestaurantStatus.ACTIVE,
        cuisine_type: {
          not: null,
        },
      },
      select: {
        cuisine_type: true,
      },
    });

    // Group by cuisine type and count
    const cuisineCounts: { [key: string]: number } = {};

    restaurants.forEach((restaurant) => {
      if (restaurant.cuisine_type) {
        cuisineCounts[restaurant.cuisine_type] =
          (cuisineCounts[restaurant.cuisine_type] || 0) + 1;
      }
    });

    const cuisines = Object.entries(cuisineCounts)
      .map(([cuisine, total_restaurants]) => ({
        cuisine,
        total_restaurants,
      }))
      .sort((a, b) => b.total_restaurants - a.total_restaurants);

    const data = {
      cuisines,
      total_unique_cuisines: cuisines.length,
    };

    return res.json(successResponse("Cuisines retrieved successfully", data));
  } catch (error) {
    return next(error);
  }
};
