import { IRoomRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/IRoomRepository";
import { Container } from "inversify";
import { TYPES } from "../types";
import { RoomRepository } from "@/repositories/user(traveler)/trip-planning/room.repository";
import { IRoomService } from "@/interfaces/IServices/user(traveler)/IRoomService";
import { RoomService } from "@/services/user(traveler)/trip-planning/room.service";
import { RoomController } from "@/controller/user(traveler)/room.controller";
import { TripPlanningRoutes } from "@/routes/user(traveler)/trip-planning.routes";
import { IMessageRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/IMessageRepository";
import { MessageRepository } from "@/repositories/user(traveler)/trip-planning/message.repository";
import { IMessageService } from "@/interfaces/IServices/user(traveler)/IMessageService";
import { MessageService } from "@/services/user(traveler)/trip-planning/message.service";
import { MessageController } from "@/controller/user(traveler)/message.controller";

export function registerTripPlanning(container: Container): void {
  container.bind<IRoomRepository>(TYPES.RoomRepository).to(RoomRepository);

  container.bind<IRoomService>(TYPES.RoomService).to(RoomService);

  container.bind(TYPES.RoomController).to(RoomController);

  container.bind<IMessageRepository>(TYPES.MessageRepository).to(MessageRepository);

  container.bind<IMessageService>(TYPES.MessageService).to(MessageService);

  container.bind(TYPES.MessageController).to(MessageController);

  container.bind(TYPES.TripPlanningRoutes).to(TripPlanningRoutes);
}
