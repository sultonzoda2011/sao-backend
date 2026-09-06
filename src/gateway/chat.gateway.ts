import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { MessagesService } from '../messages/messages.service';
import { ChatsService } from '../chats/chats.service';
import { PrismaService } from '../prisma/prisma.service';
import { verifySocketToken } from './ws-auth.util';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

interface AuthedSocket extends Socket {
  user?: JwtPayload;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/ws',
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeService,
    private readonly messagesService: MessagesService,
    private readonly chatsService: ChatsService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.realtime.setServer(server);
  }

  async handleConnection(client: AuthedSocket) {
    const payload = await verifySocketToken(
      this.jwt,
      client,
      this.config.get<string>('JWT_ACCESS_SECRET')!,
    );

    if (!payload) {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
      return;
    }

    client.user = payload;
    client.join(this.realtime.userRoom(payload.sub));

    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { isOnline: true, lastSeenAt: new Date() },
    });

    this.server.emit('user:online', { userId: payload.sub });
    this.logger.log(`Client connected: ${payload.username} (${client.id})`);
  }

  async handleDisconnect(client: AuthedSocket) {
    if (!client.user) return;
    const userId = client.user.sub;

    await this.prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeenAt: new Date() },
    });

    this.server.emit('user:offline', { userId, lastSeenAt: new Date() });
    this.logger.log(`Client disconnected: ${client.user.username} (${client.id})`);
  }

  @SubscribeMessage('chat:join')
  async onJoinChat(@ConnectedSocket() client: AuthedSocket, @MessageBody() data: { chatId: string }) {
    if (!client.user) return { error: 'Unauthorized' };
    await this.chatsService.assertParticipant(data.chatId, client.user.sub);
    client.join(this.realtime.chatRoom(data.chatId));
    return { success: true };
  }

  @SubscribeMessage('chat:leave')
  onLeaveChat(@ConnectedSocket() client: AuthedSocket, @MessageBody() data: { chatId: string }) {
    client.leave(this.realtime.chatRoom(data.chatId));
    return { success: true };
  }

  @SubscribeMessage('message:send')
  async onSendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { chatId: string; text: string },
  ) {
    if (!client.user) return { error: 'Unauthorized' };
    try {
      return await this.messagesService.createMessage(data.chatId, client.user.sub, data.text);
    } catch (e: any) {
      return { error: e.message ?? 'Failed to send message' };
    }
  }

  @SubscribeMessage('message:update')
  async onUpdateMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { messageId: string; text: string },
  ) {
    if (!client.user) return { error: 'Unauthorized' };
    try {
      return await this.messagesService.updateMessage(data.messageId, client.user.sub, data.text);
    } catch (e: any) {
      return { error: e.message ?? 'Failed to update message' };
    }
  }

  @SubscribeMessage('message:delete')
  async onDeleteMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { messageId: string },
  ) {
    if (!client.user) return { error: 'Unauthorized' };
    try {
      return await this.messagesService.deleteMessage(data.messageId, client.user.sub);
    } catch (e: any) {
      return { error: e.message ?? 'Failed to delete message' };
    }
  }

  @SubscribeMessage('chat:read')
  async onChatRead(@ConnectedSocket() client: AuthedSocket, @MessageBody() data: { chatId: string }) {
    if (!client.user) return { error: 'Unauthorized' };
    return this.messagesService.markRead(data.chatId, client.user.sub);
  }

  @SubscribeMessage('typing:start')
  onTypingStart(@ConnectedSocket() client: AuthedSocket, @MessageBody() data: { chatId: string }) {
    if (!client.user) return;
    client.to(this.realtime.chatRoom(data.chatId)).emit('typing:start', {
      chatId: data.chatId,
      userId: client.user.sub,
    });
  }

  @SubscribeMessage('typing:stop')
  onTypingStop(@ConnectedSocket() client: AuthedSocket, @MessageBody() data: { chatId: string }) {
    if (!client.user) return;
    client.to(this.realtime.chatRoom(data.chatId)).emit('typing:stop', {
      chatId: data.chatId,
      userId: client.user.sub,
    });
  }
}
