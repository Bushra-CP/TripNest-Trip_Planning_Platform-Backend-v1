import { Server } from "socket.io";
import { injectable } from "inversify";

@injectable()
export class TripTalesSocket {
  private _io: Server | null = null;

  public initialize(io: Server): void {
    this._io = io;
  }

  public emitNewPostAvailable(postId: string): void {
    if (!this._io) {
      console.error("Socket.IO has not been initialized");
      return;
    }

    this._io.emit("post:new-available", {
      postId,
    });
  }
}
