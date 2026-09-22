import { Container } from "inversify";
import { TYPES } from "../types";
import { IRoomService } from "@/interfaces/IServices/user(traveler)/IRoomService";
import { RoomService } from "@/services/user(traveler)/trip-planning/room.service";
import { RoomController } from "@/controller/user(traveler)/room.controller";
import { TripPlanningRoutes } from "@/routes/user(traveler)/trip-planning.routes";
import { IMessageService } from "@/interfaces/IServices/user(traveler)/IMessageService";
import { MessageService } from "@/services/user(traveler)/trip-planning/message.service";
import { MessageController } from "@/controller/user(traveler)/message.controller";

export function registerTripPlanning(container: Container): void {
  container.bind<IRoomService>(TYPES.RoomService).to(RoomService);

  container.bind(TYPES.RoomController).to(RoomController);

  container.bind<IMessageService>(TYPES.MessageService).to(MessageService);

  container.bind(TYPES.MessageController).to(MessageController);

  container.bind(TYPES.TripPlanningRoutes).to(TripPlanningRoutes);
}
