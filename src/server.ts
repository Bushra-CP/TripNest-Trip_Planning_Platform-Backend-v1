import http from "http";
import { Server } from "socket.io";
import { connectDB } from "@/config/db";
import { env } from "@/config/env";
import app from "./app/app";
import { container } from "./di";
import { ChatSocket } from "./socket/chat.socket";
import { TYPES } from "./di/types";

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    const httpServer = http.createServer(app);

    const io = new Server(httpServer, {
      cors: {
        origin: `${env.CLIENT_URL}`,
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    const chatSocket = container.get<ChatSocket>(TYPES.ChatSocket);

    chatSocket.initialize(io);

    httpServer.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);

      console.log(`Socket.IO running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("Application startup failed:", error);
    throw error;
  }
};

startServer();
