export interface ChangeEmailRequest {
  userId: string;
  currentEmail: string;
  newEmail: string;
  currentPassword: string;
}

export interface ChangeEmailResponse {
  message: string;
  userId: string;
  email: string;
}
