import {
  TripTalesProfileResponseDto,
  TravelerProfileResponseDto,
} from "@/dtos/user(traveler)/profile/TravelerProfileResponseDto";
import { ITravelerProfile } from "@/interfaces/IModel/ITravelerPofile";

export class ProfileMapper {
  static toProfileResponse(profile: ITravelerProfile): TravelerProfileResponseDto {
    return {
      fullName: profile.fullName,

      phone: profile.phone!,

      country: profile.country,

      state: profile.state,

      city: profile.city,

      bio: profile.bio!,

      socialPresence: profile.socialPresence,

      referenceId: profile.referenceId!,
    };
  }

  static toMyTripTalesProfileResponse(
    profile: ITravelerProfile,
    postCount: number,
  ): TripTalesProfileResponseDto {
    return {
      profile: {
        userId: profile.userId.toString(),
        fullName: profile.fullName,
        profileImageUrl: profile.profileImageUrl ?? "",
        bio: profile.bio ?? "",
        country: profile.country ?? "",
        state: profile.state ?? "",
        city: profile.city ?? "",
      },

      stats: {
        posts: postCount,
        followers: 0,
        following: 0,
      },
    };
  }
}
