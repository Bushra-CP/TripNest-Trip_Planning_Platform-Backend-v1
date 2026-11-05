import { CommentResponseDto } from "@/dtos/user(traveler)/trip-tales/comments.dto";
import { IPopulatedComment } from "@/interfaces/IModel/trip-tales/comments.model.interface";

export class CommentMapper {
  static toCommentResponse(comment: IPopulatedComment): CommentResponseDto {
    const travelerProfile = comment.userId.travelerProfile;

    return {
      id: comment._id.toString(),

      postId: comment.postId.toString(),

      parentCommentId: comment.parentCommentId ? comment.parentCommentId.toString() : null,

      user: {
        id: comment.userId._id.toString(),

        fullName: travelerProfile?.fullName ?? "Traveler",

        profileImageUrl: travelerProfile?.profileImageUrl ?? "",
      },

      content: comment.content,

      replies: [],

      repliesCount: 0,

      createdAt: comment.createdAt,

      updatedAt: comment.updatedAt,
    };
  }
}
