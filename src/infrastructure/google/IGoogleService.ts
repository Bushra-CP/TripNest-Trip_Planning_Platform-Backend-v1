export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}

export interface IGoogleService {
  getUserInfo(accessToken: string): Promise<GoogleUserInfo>;
}
