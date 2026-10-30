import { AdminTripTalesPostDto } from "@/dtos/admin/trip-tales/admin-trip-tales.dto";
import { MyPostResponseDto } from "@/dtos/user(traveler)/trip-tales/my-posts.dto";
import { CreatePostResponseDto } from "@/dtos/user(traveler)/trip-tales/trip-tales.dto";
import { MyPostDetailsResponseDto } from "@/dtos/user(traveler)/trip-tales/update-my-posts.dto";
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

  static toMyPostResponse(post: IPopulatedPost): MyPostResponseDto {
    return {
      ...this.toPostResponse(post),

      status: post.status,

      updatedAt: post.updatedAt,
    };
  }

  static toMyPostDetailsResponse(post: IPopulatedPost): MyPostDetailsResponseDto {
    return {
      ...this.toPostResponse(post),
      status: post.status,
      updatedAt: post.updatedAt,
    };
  }

  static toAdminPostResponse(post: IPopulatedPost): AdminTripTalesPostDto {
    const travelerProfile = post.userId?.travelerProfile;

    return {
      id: post._id.toString(),

      user: {
        id: post.userId?._id?.toString() ?? "",
        fullName: travelerProfile?.fullName ?? "Traveler",
        profileImageUrl: travelerProfile?.profileImageUrl ?? "",
      },

      title: post.title,
      destination: post.destination,
      content: post.content,
      tags: post.tags ?? [],
      media: post.media ?? [],
      status: post.status,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }
}
