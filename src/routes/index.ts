import { Router } from "express";
import authRoute from "./auth.route";

const router = Router();

router.use("/v1/auth", authRoute);

export default router;
