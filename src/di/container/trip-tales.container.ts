import { Container } from "inversify";
import { TYPES } from "../types";
import { IPostRepository } from "@/interfaces/IRepository/user(traveler)/trip-tales/posts.repository.interface";
import { PostRepository } from "@/repositories/user(traveler)/trip-tales/post.repository";
import { IPostService } from "@/interfaces/IServices/user(traveler)/trip-tales/posts.service.interface";
import { PostService } from "@/services/user(traveler)/trip-tales/posts.service";
import { TripTalesController } from "@/controller/user(traveler)/trip-tales.controller";
import { TripTalesRoutes } from "@/routes/user(traveler)/trip-tales.routes";
import { TripTalesRagService } from "@/services/user(traveler)/trip-tales/trip-tales-rag.service";
import { TripTalesMediaUnderstandingService } from "@/services/user(traveler)/trip-tales/trip-tales-media-understanding.service";
import { TripTalesRepository } from "@/repositories/admin/trip-tales/trip-tales.repository";
import { AdminTripTalesService } from "@/services/admin/trip-tales/admin-trip-tales.service";
import { AdminTripTalesController } from "@/controller/admin/admin-trip-tales.controller";
import { AdminTripTalesRoutes } from "@/routes/admin/admin-trip-tales.routes";
import { LikesRepository } from "@/repositories/user(traveler)/trip-tales/likes.repository";
import { LikesService } from "@/services/user(traveler)/trip-tales/likes.service";

export function registerTripTales(container: Container): void {
  container.bind<IPostRepository>(TYPES.PostRepository).to(PostRepository);
  container.bind<IPostService>(TYPES.PostService).to(PostService);
  container.bind(TYPES.TripTalesController).to(TripTalesController);
  container.bind(TYPES.TripTalesRoutes).to(TripTalesRoutes);
  container.bind(TYPES.TripTalesRagService).to(TripTalesRagService);
  container.bind(TYPES.TripTalesMediaUnderstandingService).to(TripTalesMediaUnderstandingService);
  container.bind(TYPES.TripTalesRepository).to(TripTalesRepository);
  container.bind(TYPES.AdminTripTalesService).to(AdminTripTalesService);
  container.bind(TYPES.AdminTripTalesController).to(AdminTripTalesController);
  container.bind(TYPES.AdminTripTalesRoutes).to(AdminTripTalesRoutes);
  container.bind(TYPES.LikesRepository).to(LikesRepository);
  container.bind(TYPES.LikesService).to(LikesService);
}
