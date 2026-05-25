import type { NextFunction, Request, Response } from "express";
import { hashSync, compareSync } from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../util/prisma.ts";
import { AppError } from "../errors/AppError.ts";
import { successResponse } from "../util/helper.ts";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  sendOtpSchema,
  verifyOtpSchema,
  changePasswordSchema,
} from "../schemas/auth.schema.ts";
import { ramdomOtpCodes } from "../util/index.util.ts";
import { Role } from "../../generated/prisma/enums.ts";

const JWT_SECRET = process.env.JWT_SECRET || "secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const otpStore = new Map<
  string,
  {
    code: string;
    expiresAt: number;
  }
>();

const createToken = (payload: { id: number; email: string; role: string }) =>
  jwt.sign(
    payload as any,
    JWT_SECRET as any,
    // {
    //   expiresIn: JWT_EXPIRES_IN,
    // } as any,
  ) as string;

const loginAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid login payload",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  const { email, password } = parseResult.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      phone: true,
      avatar_url: true,
      gender: true,
      role: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      password: true,
    },
  });
  if (!user) {
    return next(
      new AppError(
        "Invalid email or password",
        401,
        "AUTH_INVALID_CREDENTIALS",
      ),
    );
  }

  if (user.role !== Role.ADMIN) {
    return next(
      new AppError("Only admins can use this endpoint", 403, "AUTH_FORBIDDEN"),
    );
  }

  const matched = compareSync(password, user.password);
  if (!matched) {
    return next(
      new AppError(
        "Invalid email or password",
        401,
        "AUTH_INVALID_CREDENTIALS",
      ),
    );
  }

  const token = createToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const { password: _, ...userResponse } = user;

  return res.json(
    successResponse("Logged in successfully", {
      token,
      user: userResponse,
    }),
  );
};

const login = async (req: Request, res: Response, next: NextFunction) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid login payload",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  const { email, password } = parseResult.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      phone: true,
      avatar_url: true,
      gender: true,
      role: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      password: true,
    },
  });
  if (!user) {
    return next(
      new AppError(
        "Invalid email or password",
        401,
        "AUTH_INVALID_CREDENTIALS",
      ),
    );
  }

  const matched = compareSync(password, user.password);
  if (!matched) {
    return next(
      new AppError(
        "Invalid email or password",
        401,
        "AUTH_INVALID_CREDENTIALS",
      ),
    );
  }

  const token = createToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const { password: _, ...userResponse } = user;

  return res.json(
    successResponse("Logged in successfully", {
      token,
      user: userResponse,
    }),
  );
};

const register = async (req: Request, res: Response, next: NextFunction) => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid registration payload",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  const { email, password, first_name, last_name, phone, gender, role } =
    parseResult.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return next(
      new AppError("Email already in use", 409, "USER_ALREADY_EXISTS"),
    );
  }

  const hashed = hashSync(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      first_name,
      last_name,
      phone,
      gender,
      role,
      // create role-specific record depending on selected role
      ...(role === Role.OWNER && {
        restaurant_owner: {
          create: {},
        },
      }),
      ...(role === Role.ADMIN && {
        admin: {
          create: {},
        },
      }),
      ...(role === Role.CUSTOMER && {
        customer: {
          create: {},
        },
      }),
    },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      phone: true,
      avatar_url: true,
      gender: true,
      role: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  const token = createToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return res
    .status(201)
    .json(
      successResponse(
        `${role === Role.OWNER ? "Owner" : role === Role.ADMIN ? "Admin" : "User"} registered successfully`,
        { token, user },
      ),
    );
};

const profile = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    return next(new AppError("Not authenticated", 401, "AUTH_MISSING"));
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      gender: true,
      phone: true,
      avatar_url: true,
      role: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!user) {
    return next(new AppError("User not found", 404, "USER_NOT_FOUND"));
  }

  return res.json(successResponse("User profile fetched", { user }));
};

const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = (req as any).user?.id;
  const userRole = (req as any).user?.role;
  if (!userId) {
    return next(new AppError("Not authenticated", 401, "AUTH_MISSING"));
  }

  const parseResult = updateProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid profile update payload",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  // Check if user is trying to update role
  if (parseResult.data.role !== undefined) {
    // Only ADMIN can update role
    if (userRole !== Role.ADMIN) {
      return next(
        new AppError(
          "Only admins can update user roles",
          403,
          "ROLE_UPDATE_FORBIDDEN",
        ),
      );
    }
  }

  if (parseResult.data.email) {
    const existingEmailUser = await prisma.user.findUnique({
      where: { email: parseResult.data.email },
      select: { id: true },
    });

    if (existingEmailUser && existingEmailUser.id !== userId) {
      return next(
        new AppError("Email already in use", 409, "USER_EMAIL_ALREADY_EXISTS"),
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: parseResult.data,
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      phone: true,
      gender: true,
      avatar_url: true,
      role: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  return res.json(
    successResponse("User updated successfully", { user: updated }),
  );
};

const sentSms = async (req: Request, res: Response, next: NextFunction) => {
  const parseResult = sendOtpSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid payload",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  const { phone, is_debug } = parseResult.data;
  const code = is_debug ? "1234" : ramdomOtpCodes().toString().padStart(4, "0");
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  const expiresAtLocal = new Date(expiresAt).toLocaleString("en-US", {
    hour12: true,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  otpStore.set(phone, { code, expiresAt });

  // In a real system, you'd integrate with an SMS provider here.
  console.log(`OTP for ${phone}: ${code}`);

  return res.json(
    successResponse("Otp has been generated and sent", {
      phone,
      expiresAt: expiresAtLocal,
    }),
  );
};

const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  const parseResult = verifyOtpSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid payload",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  const { phone, otp } = parseResult.data;
  const record = otpStore.get(phone);

  if (!record) {
    return next(new AppError("OTP not found", 404, "OTP_NOT_FOUND"));
  }

  if (record.expiresAt < Date.now()) {
    otpStore.delete(phone);
    return next(new AppError("OTP expired", 400, "OTP_EXPIRED"));
  }

  if (record.code !== otp) {
    return next(new AppError("Invalid OTP code", 400, "OTP_INVALID"));
  }

  otpStore.delete(phone);

  // Find existing user by phone or create new customer user
  let user = await prisma.user.findFirst({
    where: { phone },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      phone: true,
      gender: true,
      avatar_url: true,
      role: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!user) {
    const randomPassword = hashSync(Math.random().toString(36).slice(2), 10);
    const email = `otp_${phone.replace(/\D/g, "") || "user"}@table.site`;

    user = await prisma.user.create({
      data: {
        email,
        password: randomPassword,
        first_name: "Guest",
        last_name: phone,
        phone,
        role: Role.CUSTOMER,
        customer: { create: {} },
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        gender: true,
        phone: true,
        avatar_url: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  const token = createToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return res.json(
    successResponse("Logged in successfully", {
      token,
      user,
    }),
  );
};

const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    return next(new AppError("Not authenticated", 401, "AUTH_MISSING"));
  }

  const parseResult = changePasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new AppError(
        "Invalid password change payload",
        400,
        "VALIDATION_ERROR",
        parseResult.error.issues,
      ),
    );
  }

  const { current_password, new_password } = parseResult.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      password: true,
    },
  });

  if (!user) {
    return next(new AppError("User not found", 404, "USER_NOT_FOUND"));
  }

  const matched = compareSync(current_password, user.password);
  if (!matched) {
    return next(
      new AppError(
        "Current password is incorrect",
        400,
        "INVALID_CURRENT_PASSWORD",
      ),
    );
  }

  const hashedPassword = hashSync(new_password, 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
    },
  });

  return res.json(successResponse("Password changed successfully", {}));
};

const logout = async (req: Request, res: Response, next: NextFunction) => {
  // JWT is stateless — client discards the token.
  // Optionally revoke refresh tokens stored in DB here in the future.
  return res.json(successResponse("Logged out successfully", {}));
};

export {
  login,
  loginAdmin,
  register,
  profile,
  updateProfile,
  sentSms,
  verifyOtp,
  changePassword,
  logout,
};
