import { TravelerProfileResponseDto } from "@/dtos/user(traveler)/profile/TravelerProfileResponseDto";
import { ITravelerProfile } from "@/interfaces/IModel/ITravelerPofile";

export class ProfileMapper {
  static toProfileResponse(profile: ITravelerProfile, message: string): TravelerProfileResponseDto {
    return {
      fullName: profile.fullName,

      phone: profile.phone!,

      country: profile.country,

      state: profile.state,

      city: profile.city,

      bio: profile.bio!,

      socialPresence: profile.socialPresence,

      referenceId: profile.referenceId!,

      message,
    };
  }
}
