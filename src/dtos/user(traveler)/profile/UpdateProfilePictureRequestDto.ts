export interface UpdateProfilePictureRequestDto {
  userId: string;
  profileImage: Express.Multer.File;
}
