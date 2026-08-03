import { ISocialPresence } from "./TravelerProfileResponseDto";

export interface UpdateTravelerProfileRequestDto {
  userId: string;

  fullName: string;

  phone: string;

  country: string;

  state: string;

  city: string;

  bio: string;

  socialPresence: ISocialPresence[];
}

export interface UpdateTravelerProfileResponseDto {
  message: string;
}
