import "reflect-metadata";
import express from "express";
import cors from "cors";
import { notFoundMiddleware } from "../shared/middleware/notfound.middleware.js";
import { errorMiddleware } from "../shared/middleware/error.middleware.js";
import { container } from "../di/index.js";
import type { TravelerProfileRoutes } from "../features/traveler/register/routes/traveler-profile.routes.js";
import { TYPES } from "../di/types.js";

const app = express();

const travelerProfileRoutes = container.get<TravelerProfileRoutes>(
  TYPES.TravelerProfileRoutes,
);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.use("/TripNest", travelerProfileRoutes.router);

// Route not found
app.use(notFoundMiddleware);

// Error handler
app.use(errorMiddleware);

export default app;
