import { CreatePostResponseDto } from "@/dtos/user(traveler)/trip-tales/trip-tales.dto";
import { IPopulatedPost } from "@/interfaces/IModel/trip-tales/posts.model.interface";

export class TripTalesPostMapper {
  static toPostResponse(post: IPopulatedPost): CreatePostResponseDto {
    const travelerProfile = post.userId.travelerProfile;

    return {
      id: post._id.toString(),

      user: {
        id: post.userId._id.toString(),

        fullName: travelerProfile?.fullName ?? "Traveler",

        profileImageUrl: travelerProfile?.profileImageUrl ?? "",
      },

      title: post.title,

      destination: post.destination,

      content: post.content,

      tags: post.tags,

      media: post.media,

      createdAt: post.createdAt,
    };
  }
}
