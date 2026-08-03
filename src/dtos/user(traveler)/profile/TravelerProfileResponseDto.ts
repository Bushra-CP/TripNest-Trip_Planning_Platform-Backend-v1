export interface ISocialPresence {
  url: string;
}

export interface TravelerProfilePayload {
  userId: string;
}

export interface TravelerProfileResponseDto {
  fullName: string;

  phone: string;

  country: string;

  state: string;

  city: string;

  bio: string;

  socialPresence: ISocialPresence[];

  referenceId: string;
}
