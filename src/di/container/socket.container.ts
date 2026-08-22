import { Container } from "inversify";
import { TYPES } from "../types";
import { ChatSocket } from "@/socket/chat.socket";

export function registerSocket(container: Container): void {
  container.bind(TYPES.ChatSocket).to(ChatSocket);
}
