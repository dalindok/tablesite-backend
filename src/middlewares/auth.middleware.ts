import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export type AuthRequest = Request & {
  user?: { id: number; email: string; role: Role };
};

export const authMiddleware = (roles?: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        new AppError(
          "Missing or invalid authorization header",
          401,
          "AUTH_MISSING",
        ),
      );
    }

    const token = authHeader.split(" ")[1];

    try {
      const payload = jwt.verify(token, JWT_SECRET) as {
        id: number;
        email: string;
        role: Role;
      };

      if (!payload || !payload.id) {
        return next(
          new AppError("Invalid token payload", 401, "AUTH_INVALID_TOKEN"),
        );
      }

      if (roles && roles.length && !roles.includes(payload.role)) {
        return next(new AppError("Forbidden", 403, "AUTH_FORBIDDEN"));
      }

      req.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
      };

      return next();
    } catch (error) {
      return next(
        new AppError("Invalid or expired token", 401, "AUTH_INVALID_TOKEN"),
      );
    }
  };
};
