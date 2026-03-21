import express from "express";
import authRoute from "./auth.route.ts";

const rootRouter = express.Router();

rootRouter.use("/v1/auth", authRoute);

export default rootRouter;
