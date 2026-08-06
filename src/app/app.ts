import "reflect-metadata";
import express from "express";
import cors from "cors";
import { notFoundMiddleware } from "../middleware/notfound.middleware.js";
import { ErrorMiddleware } from "../middleware/error.middleware.js";
import { container } from "../di/index.js";

import { TYPES } from "../di/types.js";
import { TravelerProfileRoutes } from "../routes/user(traveler)/traveler-profile.routes.js";
import { AuthRoutes } from "../routes/auth/auth.routes.js";
import cookieParser from "cookie-parser";

const app = express();

const travelerProfileRoutes = container.get<TravelerProfileRoutes>(TYPES.TravelerProfileRoutes);

const authRoute = container.get<AuthRoutes>(TYPES.AuthRoutes);

const errorMiddleware = container.get<ErrorMiddleware>(TYPES.ErrorMiddleware);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(cookieParser());

app.use(express.json());

app.use("/", travelerProfileRoutes.router);
app.use("/", authRoute.router);

// Route not found
app.use(notFoundMiddleware);

// Error handler
app.use(errorMiddleware.handle.bind(errorMiddleware));

export default app;
