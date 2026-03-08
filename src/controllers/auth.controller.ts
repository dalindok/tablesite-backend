import { NextFunction, Request, Response } from "express";
import { hashSync, compareSync } from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../util/prisma";
import { AppError } from "../errors/AppError";
import { successResponse } from "../util/helper";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from "../schemas/auth.schema";
import { ramdomOtpCodes } from "../util/index.util";
import { Role } from "@prisma/client";

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
    {
      expiresIn: JWT_EXPIRES_IN,
    } as any,
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

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return next(
      new AppError(
        "Invalid email or password",
        401,
        "AUTH_INVALID_CREDENTIALS",
      ),
    );
  }

  if (user.role !== "ADMIN") {
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

  return res.json(
    successResponse("Logged in successfully", {
      token,
      user: { id: user.id, email: user.email, role: user.role },
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
  const user = await prisma.user.findUnique({ where: { email } });
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

  return res.json(
    successResponse("Logged in successfully", {
      token,
      user: { id: user.id, email: user.email, role: user.role },
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

  const { email, password, first_name, last_name, phone, role } =
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
      role: true,
    },
  });

  return res
    .status(201)
    .json(successResponse("User registered successfully", { user }));
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

  const updated = await prisma.user.update({
    where: { id: userId },
    data: parseResult.data,
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      phone: true,
      avatar_url: true,
      role: true,
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

  const { phone } = parseResult.data;
  const code = ramdomOtpCodes().toString().padStart(4, "0");
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(phone, { code, expiresAt });

  // In a real system, you'd integrate with an SMS provider here.
  console.log(`OTP for ${phone}: ${code}`);

  return res.json(
    successResponse("Otp has been generated and sent", { phone, expiresAt }),
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
  return res.json(successResponse("OTP verified", { phone }));
};

export {
  login,
  loginAdmin,
  register,
  profile,
  updateProfile,
  sentSms,
  verifyOtp,
};
