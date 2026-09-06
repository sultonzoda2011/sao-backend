import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private server?: Server;

  setServer(server: Server) {
    this.server = server;
  }

  chatRoom(chatId: string) {
    return `chat:${chatId}`;
  }

  userRoom(userId: string) {
    return `user:${userId}`;
  }

  emitToChat(chatId: string, event: string, payload: unknown) {
    this.server?.to(this.chatRoom(chatId)).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(this.userRoom(userId)).emit(event, payload);
  }
}
