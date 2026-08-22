export interface IRoomService {
  createRoom(userId: string): Promise<{
    roomId: string;
  }>;

  getRoom(roomId: string): Promise<{
    roomId: string;
  }>;
}
