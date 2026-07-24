import "reflect-metadata";
import express from "express";
import cors from "cors";
import { notFoundMiddleware } from "../shared/middleware/notfound.middleware.js";
import { errorMiddleware } from "../shared/middleware/error.middleware.js";
import { container } from "../di/index.js";

import { TYPES } from "../di/types.js";
import { TravelerProfileRoutes } from "../routes/user(traveler)/traveler-profile.routes.js";
import { AuthRoutes } from "../routes/auth/auth.routes.js";
import { ForgotPasswordRoutes } from "../routes/user(traveler)/forgot-password.routes.js";

const app = express();

const travelerProfileRoutes = container.get<TravelerProfileRoutes>(TYPES.TravelerProfileRoutes);

const authRoute = container.get<AuthRoutes>(TYPES.AuthRoutes);

const forgotPasswordRoutes = container.get<ForgotPasswordRoutes>(TYPES.ForgotPasswordRoutes);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.use("/", travelerProfileRoutes.router);
app.use("/", authRoute.router);
app.use("/", forgotPasswordRoutes.router);

// Route not found
app.use(notFoundMiddleware);

// Error handler
app.use(errorMiddleware);

export default app;
