import { Role } from "@prisma/client";
import { z } from "zod";

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().optional(),
  role: z
    .enum([Role.CUSTOMER, Role.OWNER, Role.ADMIN])
    .optional()
    .default(Role.CUSTOMER),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const updateProfileSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatar_url: z.string().url().optional(),
});

export const sendOtpSchema = z.object({
  phone: z.string().min(6),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(6),
  otp: z.string().length(4),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type SendOtpBody = z.infer<typeof sendOtpSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
