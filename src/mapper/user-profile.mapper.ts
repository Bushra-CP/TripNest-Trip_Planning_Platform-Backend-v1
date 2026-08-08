import { UserProfile } from "@/dtos/admin/user-management/users.dto";
import { ITravelerProfile } from "@/interfaces/IModel/ITravelerPofile";

export class UserProfileMapper {
  static toUserProfileDto(profile: ITravelerProfile): UserProfile {
    return {
      fullName: profile.fullName,

      ...(profile.phone && {
        phoneNumber: profile.phone,
      }),

      country: profile.country,

      state: profile.state,

      city: profile.city,

      ...(profile.bio && {
        bio: profile.bio,
      }),

      ...(profile.profileImageUrl && {
        profileImage: profile.profileImageUrl,
      }),

      socialPresence: profile.socialPresence,

      ...(profile.referenceId && {
        referenceId: profile.referenceId,
      }),

      rewardPoints: profile.rewardPoints,

      createdAt: profile.createdAt,

      updatedAt: profile.updatedAt,
    };
  }
}
