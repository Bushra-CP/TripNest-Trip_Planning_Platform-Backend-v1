import { UpdateProfilePictureRequestDto } from "@/dtos/user(traveler)/profile/UpdateProfilePictureRequestDto";
import { UpdateProfilePictureResponseDto } from "@/dtos/user(traveler)/profile/UpdateProfilePictureResponseDto";

export interface IProfileService {
  updateProfilePic(data: UpdateProfilePictureRequestDto): Promise<UpdateProfilePictureResponseDto>;
}
