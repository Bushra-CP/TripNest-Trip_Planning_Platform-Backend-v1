import { IPopulatedPost, IPost } from "@/interfaces/IModel/trip-tales/posts.model.interface";
import { IBaseRepository } from "../../IBaseRepository";

export interface IPostRepository extends IBaseRepository<IPost> {
  findAllWithUser(): Promise<IPopulatedPost[]>;

  findByIdWithUser(postId: string): Promise<IPopulatedPost | null>;
}
