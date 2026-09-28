import { Router } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";
import { AuthenticateMiddleware } from "@/middleware/authenticate.middleware";
import { validate } from "@/middleware/validate.middleware";
import { uploadPostMedia } from "@/middleware/multer/post-upload";
import { createPostSchema } from "@/validation/user(traveler)/trip-tales/create-post.validation";
import { TripTalesController } from "@/controller/user(traveler)/trip-tales.controller";

@injectable()
export class TripTalesRoutes {
  public readonly router: Router;

  constructor(
    @inject(TYPES.TripTalesController)
    private readonly _postController: TripTalesController,

    @inject(TYPES.AuthenticateMiddleware)
    private readonly _authenticateMiddleware: AuthenticateMiddleware,
  ) {
    this.router = Router();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/posts",
      this._authenticateMiddleware.authenticate,
      uploadPostMedia.array("media", 10),
      validate(createPostSchema),
      this._postController.createPost.bind(this._postController),
    );

    this.router.get("/posts", this._postController.getPosts.bind(this._postController));

    this.router.get("/posts/:postId", this._postController.getPostById.bind(this._postController));
  }
}
