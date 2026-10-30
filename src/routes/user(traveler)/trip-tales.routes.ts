import { Router } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";
import { AuthenticateMiddleware } from "@/middleware/authenticate.middleware";
import { validate } from "@/middleware/validate.middleware";
import { uploadPostMedia } from "@/middleware/multer/post-upload";
import { createPostSchema } from "@/validation/user(traveler)/trip-tales/create-post.validation";
import { TripTalesController } from "@/controller/user(traveler)/trip-tales.controller";
import { AuthorizeMiddleware } from "@/middleware/authorize.middleware";
import { UserRole } from "@/enums/user-role.enum";

@injectable()
export class TripTalesRoutes {
  public readonly router: Router;

  constructor(
    @inject(TYPES.TripTalesController)
    private readonly _tripTalesController: TripTalesController,

    @inject(TYPES.AuthenticateMiddleware)
    private readonly _authenticateMiddleware: AuthenticateMiddleware,

    @inject(TYPES.AuthorizeMiddleware)
    private readonly _authorizeMiddleware: AuthorizeMiddleware,
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
      this._tripTalesController.createPost.bind(this._tripTalesController),
    );

    // My TripTales posts
    this.router.get(
      "/my-posts",
      this._authenticateMiddleware.authenticate,
      this._tripTalesController.getMyPosts.bind(this._tripTalesController),
    );

    // Public feed
    this.router.get("/posts", this._tripTalesController.getPosts.bind(this._tripTalesController));

    this.router.get(
      "/posts/:postId",
      this._tripTalesController.getPostById.bind(this._tripTalesController),
    );

    // Get one of the authenticated user's posts.
    this.router.get(
      "/my-posts/:postId",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._tripTalesController.getMyPostById.bind(this._tripTalesController),
    );

    // Update one of the authenticated user's posts.
    this.router.put(
      "/my-posts/:postId",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      uploadPostMedia.array("media", 10),
      this._tripTalesController.updateMyPost.bind(this._tripTalesController),
    );

    // Delete one of the authenticated user's posts.
    this.router.delete(
      "/my-posts/:postId",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._tripTalesController.deleteMyPost.bind(this._tripTalesController),
    );
  }
}
