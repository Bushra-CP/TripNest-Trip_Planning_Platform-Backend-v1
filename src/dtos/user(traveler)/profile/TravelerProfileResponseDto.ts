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

// TripTales profile response
export interface TripTalesProfileResponseDto {
  profile: {
    userId: string;
    fullName: string;
    profileImageUrl: string;
    bio: string;
    country: string;
    state: string;
    city: string;
  };

  stats: {
    posts: number;
    followers: number;
    following: number;
  };
}
