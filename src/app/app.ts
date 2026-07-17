import "reflect-metadata";
import express from "express";
import cors from "cors";
import { notFoundMiddleware } from "../shared/middleware/notfound.middleware.js";
import { errorMiddleware } from "../shared/middleware/error.middleware.js";
import { container } from "../di/index.js";
import type { TravelerProfileRoutes } from "../features/traveler/register/routes/traveler-profile.routes.js";
import type { AuthRoutes } from "../features/auth/routes/auth.routes.js";

import { TYPES } from "../di/types.js";

const app = express();

const travelerProfileRoutes = container.get<TravelerProfileRoutes>(
  TYPES.TravelerProfileRoutes,
);

const authRoute = container.get<AuthRoutes>(TYPES.AuthRoutes);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.use("/", travelerProfileRoutes.router);
app.use("/", authRoute.router);

// Route not found
app.use(notFoundMiddleware);

// Error handler
app.use(errorMiddleware);

export default app;
