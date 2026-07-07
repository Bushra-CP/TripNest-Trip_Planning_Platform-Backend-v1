import express from "express";
import { notFoundMiddleware } from "./shared/middleware/notfound.middleware.js";
import { errorMiddleware } from "./shared/middleware/error.middleware.js";

const app = express();

app.use(express.json());

// Route not found
app.use(notFoundMiddleware);

// Error handler
app.use(errorMiddleware);

export default app;
