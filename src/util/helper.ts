import type { NextFunction, Request, Response } from "express";

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

/**
 * Safely parse a route param (Express 5 types params as `string | string[]`).
 * Always returns the first value as an integer.
 */
export const parseParamId = (param: string | string[]): number =>
  parseInt(Array.isArray(param) ? param[0] : param, 10);
