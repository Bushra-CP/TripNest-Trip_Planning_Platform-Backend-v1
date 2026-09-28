import { injectable } from "inversify";
import { BaseRepository } from "@/repositories/base.repository";
import { IPopulatedPost, IPost } from "@/interfaces/IModel/trip-tales/posts.model.interface";
import { PostModel } from "@/models/user(traveler)/trip-tales/post.model";
import { IPostRepository } from "@/interfaces/IRepository/user(traveler)/trip-tales/posts.repository.interface";

@injectable()
export class PostRepository extends BaseRepository<IPost> implements IPostRepository {
  constructor() {
    super(PostModel);
  }

  // Get all posts with user information.
  async findAllWithUser(): Promise<IPopulatedPost[]> {
    return this.model
      .find()
      .populate({
        path: "userId",
        populate: {
          path: "travelerProfile",
        },
      })
      .sort({ createdAt: -1 })
      .exec() as Promise<IPopulatedPost[]>;
  }

  // Get one post with user information.
  async findByIdWithUser(postId: string): Promise<IPopulatedPost | null> {
    return this.model
      .findById(postId)
      .populate({
        path: "userId",
        populate: {
          path: "travelerProfile",
        },
      })
      .exec() as Promise<IPopulatedPost | null>;
  }
}
