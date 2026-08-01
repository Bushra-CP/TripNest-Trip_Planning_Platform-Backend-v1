export const IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;

export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;

export enum MediaFolder {
  PROFILE_IMAGES = "profile-images",
  COVER_IMAGES = "cover-images",
  POST_IMAGES = "post-images",
  VIDEOS = "videos",
}
