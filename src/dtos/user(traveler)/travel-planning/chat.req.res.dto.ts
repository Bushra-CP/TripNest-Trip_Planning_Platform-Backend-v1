export interface SendMessageRequestDto {
  roomId: string;
  senderId: string;
  message: string;
}

export interface SendMessageResponseDto {
  _id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderPic: string;
  message: string;
  createdAt: Date;
}
