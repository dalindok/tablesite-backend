import { Router } from "express";
import { healthController } from "../controllers/health.controller";
import { asyncHandler } from "../util/helper";

const router = Router();

router.get("/", asyncHandler(healthController.healthCheck));

export default router;
