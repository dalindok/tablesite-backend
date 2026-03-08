import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

export const notFoundMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};
