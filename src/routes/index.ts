import express from "express";
import authRoute from "./auth.route.ts";
import restaurantRoute from "./restaurant.route.ts";
import menuRoute from "./menu.route.ts";
import bookingRoute from "./booking.route.ts";

const rootRouter = express.Router();

rootRouter.use("/v1/auth", authRoute);
rootRouter.use("/v1/restaurants", restaurantRoute);
rootRouter.use("/v1/restaurants", menuRoute);
rootRouter.use("/v1/bookings", bookingRoute);

export default rootRouter;
