import { NextFunction, Request, Response } from "express";

export const successResponse = <T>(message: string, data?: T) => ({
  success: true,
  message,
  data,
});

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
