import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rootRouter from "./routes/index.ts";
import { notFoundMiddleware } from "./middlewares/notFound.middleware.ts";
import { errorMiddleware } from "./middlewares/error.middleware.ts";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api", rootRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
