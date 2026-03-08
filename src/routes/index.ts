import { Router } from "express";

const router = Router();

router.use("/v1/auth", authRoute);

export default router;
