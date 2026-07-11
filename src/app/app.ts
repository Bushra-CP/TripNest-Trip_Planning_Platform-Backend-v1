import "reflect-metadata";
import express from "express";
import cors from "cors";
import { notFoundMiddleware } from "./middleware/notfound.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import routes from "./app/routes/index.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.use("/", routes);

// Route not found
app.use(notFoundMiddleware);

// Error handler
app.use(errorMiddleware);

export default app;
