import { injectable } from "inversify";
import { Types } from "mongoose";

import { ICommentsRepository } from "@/interfaces/IRepository/user(traveler)/trip-tales/comments.repository.interface";
import {
  IComment,
  IPopulatedComment,
} from "@/interfaces/IModel/trip-tales/comments.model.interface";
import { CommentModel } from "@/models/user(traveler)/trip-tales/comments.model";

@injectable()
export class CommentsRepository implements ICommentsRepository {
  // Create a normal comment or a reply
  async createComment(
    postId: string,
    userId: string,
    content: string,
    parentCommentId: string | null = null,
  ): Promise<IComment> {
    return CommentModel.create({
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
      content,
      parentCommentId: parentCommentId ? new Types.ObjectId(parentCommentId) : null,
    });
  }

  // Fetch paginated top-level comments
  async findTopLevelCommentsByPostId(
    postId: string,
    page: number,
    limit: number,
  ): Promise<IPopulatedComment[]> {
    return CommentModel.find({
      postId: new Types.ObjectId(postId),
      parentCommentId: null,
    })
      .populate({
        path: "userId",
        populate: {
          path: "travelerProfile",
        },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean({ virtuals: true }) as unknown as Promise<IPopulatedComment[]>;
  }

  // Fetch all comments and replies belonging to a post
  async findAllCommentsByPostId(postId: string): Promise<IPopulatedComment[]> {
    return CommentModel.find({
      postId: new Types.ObjectId(postId),
    })
      .populate({
        path: "userId",
        populate: {
          path: "travelerProfile",
        },
      })
      .sort({ createdAt: -1 })
      .lean({ virtuals: true }) as unknown as Promise<IPopulatedComment[]>;
  }

  // Find one comment with populated user information
  async findPopulatedCommentById(commentId: string): Promise<IPopulatedComment | null> {
    return CommentModel.findById(new Types.ObjectId(commentId))
      .populate({
        path: "userId",
        populate: {
          path: "travelerProfile",
        },
      })
      .lean({ virtuals: true }) as unknown as Promise<IPopulatedComment | null>;
  }

  // Find one comment without populated user information
  async findCommentById(commentId: string): Promise<IComment | null> {
    return CommentModel.findById(new Types.ObjectId(commentId));
  }

  // Count all comments and replies belonging to a post
  async countCommentsByPostId(postId: string): Promise<number> {
    return CommentModel.countDocuments({
      postId: new Types.ObjectId(postId),
    });
  }

  // Count only top-level comments
  async countTopLevelCommentsByPostId(postId: string): Promise<number> {
    return CommentModel.countDocuments({
      postId: new Types.ObjectId(postId),
      parentCommentId: null,
    });
  }

  // Count comments for multiple posts
  async countCommentsByPostIds(postIds: string[]): Promise<Map<string, number>> {
    const objectIds = postIds.map((id) => new Types.ObjectId(id));

    const results = await CommentModel.aggregate([
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

    const counts = new Map<string, number>();

    results.forEach((result) => {
      counts.set(result._id.toString(), result.count);
    });

    return counts;
  }

  // Find direct replies for the given parent comment IDs
  async findChildComments(parentCommentIds: string[]): Promise<IComment[]> {
    if (parentCommentIds.length === 0) {
      return [];
    }

    return CommentModel.find({
      parentCommentId: {
        $in: parentCommentIds.map((id) => new Types.ObjectId(id)),
      },
    });
  }

  // Update a comment belonging to a specific user
  async updateComment(
    commentId: string,
    userId: string,
    content: string,
  ): Promise<IComment | null> {
    return CommentModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(commentId),
        userId: new Types.ObjectId(userId),
      },
      {
        $set: { content },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  // Delete multiple comments by their IDs
  async deleteCommentsByIds(commentIds: string[]): Promise<void> {
    if (commentIds.length === 0) {
      return;
    }

    await CommentModel.deleteMany({
      _id: {
        $in: commentIds.map((id) => new Types.ObjectId(id)),
      },
    });
  }

  // Delete one comment belonging to a specific user
  async deleteComment(commentId: string, userId: string): Promise<IComment | null> {
    return CommentModel.findOneAndDelete({
      _id: new Types.ObjectId(commentId),
      userId: new Types.ObjectId(userId),
    });
  }

  // Delete all comments and replies belonging to a post
  async deleteCommentsByPostId(postId: string): Promise<void> {
    await CommentModel.deleteMany({
      postId: new Types.ObjectId(postId),
    });
  }
}
