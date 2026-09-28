export interface CreatePostRequestDto {
  title: string;

  destination: string;

  content: string;

  tags: string[];
} //The files don't need to be inside the DTO because Multer puts them into: req.files

export interface CreatePostResponseDto {
  id: string;

  user: {
    id: string;
    fullName: string;
    profileImageUrl: string;
  };

  title: string;
  destination: string;
  content: string;
  tags: string[];

  media: {
    key: string;
    url: string;
    type: "image" | "video";
  }[];

  createdAt: Date;
}
