import { NextFunction, Request, Response } from "express";
import { hashSync, compareSync } from "bcrypt";
import * as jwt from "jsonwebtoken";

const loginAdmin = async (req: Request, res: Response) => {};
const register = async (req: Request, res: Response, next: NextFunction) => {};
const profile = async (req: Request, res: Response) => {};
const updateProfile = async (req: Request, res: Response) => {};
const sentSms = async (req: Request, res: Response) => {};
const verifyOtp = async (req: Request, res: Response) => {};

export { loginAdmin, register, profile, updateProfile, sentSms, verifyOtp };
