import { injectable } from "inversify";
import { Types } from "mongoose";

import { TripTalesLikeModel } from "@/models/user(traveler)/trip-tales/trip-tales-like.model";

import { IPopulatedTripTalesLike } from "@/interfaces/IModel/trip-tales/trip-tales-like.model.interface";

import {
  ILikesRepository,
  ILikeCount,
} from "@/interfaces/IRepository/user(traveler)/trip-tales/likes.repository.interface";

@injectable()
export class LikesRepository implements ILikesRepository {
  // Add a like.
  async addLike(postId: string, userId: string): Promise<void> {
    await TripTalesLikeModel.updateOne(
      {
        postId: new Types.ObjectId(postId),
        userId: new Types.ObjectId(userId),
      },
      {
        $setOnInsert: {
          postId: new Types.ObjectId(postId),
          userId: new Types.ObjectId(userId),
        },
      },
      {
        upsert: true,
      },
    );
  }

  // Remove a like
  async removeLike(postId: string, userId: string): Promise<void> {
    await TripTalesLikeModel.deleteOne({
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
    }).exec();
  }

  // Check whether a user has liked a particular post.
  async hasUserLikedPost(postId: string, userId: string): Promise<boolean> {
    const like = await TripTalesLikeModel.exists({
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
    });

    return Boolean(like);
  }

  // Get total likes for one post.
  async countLikes(postId: string): Promise<number> {
    return TripTalesLikeModel.countDocuments({
      postId: new Types.ObjectId(postId),
    }).exec();
  }

  // Get like counts for multiple posts in one aggregation.
  async countLikesForPosts(postIds: string[]): Promise<ILikeCount[]> {
    if (postIds.length === 0) {
      return [];
    }

    const objectIds = postIds.map((id) => new Types.ObjectId(id));

    const results = await TripTalesLikeModel.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      {
        $match: {
          postId: { $in: objectIds },
        },
      },
      {
        $group: {
          _id: "$postId",
          count: { $sum: 1 },
        },
      },
    ]);

    return results.map((result) => ({
      postId: result._id.toString(),
      count: result.count,
    }));
  }

  // Get post IDs liked by a particular user.
  async findLikedPostIds(postIds: string[], userId: string): Promise<string[]> {
    if (postIds.length === 0) {
      return [];
    }

    const results = await TripTalesLikeModel.find({
      postId: {
        $in: postIds.map((id) => new Types.ObjectId(id)),
      },
      userId: new Types.ObjectId(userId),
    })
      .select("postId")
      .lean()
      .exec();

    return results.map((like) => like.postId.toString());
  }

  // Get paginated users who liked a post.
  async findLikesByPost(
    postId: string,
    page: number,
    limit: number,
  ): Promise<IPopulatedTripTalesLike[]> {
    const skip = (page - 1) * limit;

    return TripTalesLikeModel.find({
      postId: new Types.ObjectId(postId),
    })
      .populate({
        path: "userId",
        select: "_id",
        populate: {
          path: "travelerProfile",
          select: "fullName profileImageUrl",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec() as Promise<IPopulatedTripTalesLike[]>;
  }

  // Remove all likes associated with a deleted post.
  async deleteLikesByPostId(postId: string): Promise<void> {
    await TripTalesLikeModel.deleteMany({
      postId: new Types.ObjectId(postId),
    }).exec();
  }
}
