import app from "@/app/app";
import { connectDB } from "@/config/db";
import { env } from "@/config/env";

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("Application startup failed:", error);
    throw error;
  }
};

startServer();
