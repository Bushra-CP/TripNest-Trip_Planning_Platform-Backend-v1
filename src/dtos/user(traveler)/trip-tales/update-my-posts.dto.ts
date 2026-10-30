import { CreatePostResponseDto } from "./trip-tales.dto";

export interface UpdateMyPostDto {
  title?: string;
  destination?: string;
  content?: string;
  tags?: string[];
  keepMediaKeys?: string[];
}

export interface MyPostDetailsResponseDto extends CreatePostResponseDto {
  status: "PUBLISHED" | "BLOCKED";
  updatedAt: Date;
}
