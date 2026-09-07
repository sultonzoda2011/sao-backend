import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatsService } from '../chats/chats.service';
import { RealtimeService } from '../gateway/realtime.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatsService: ChatsService,
    private readonly realtime: RealtimeService,
  ) {}

  private serialize(message: any) {
    return {
      id: message.id,
      chatId: message.chatId,
      senderId: message.senderId,
      text: message.deletedAt ? null : message.text,
      deleted: !!message.deletedAt,
      isEdited: message.isEdited,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  async createMessage(chatId: string, senderId: string, text: string) {
    await this.chatsService.assertParticipant(chatId, senderId);

    const message = await this.prisma.message.create({
      data: { chatId, senderId, text },
    });

    await this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    const serialized = this.serialize(message);
    this.realtime.emitToChat(chatId, 'message:new', serialized);
    return serialized;
  }

  async getHistory(chatId: string, userId: string, cursor?: string, limit = 30) {
    await this.chatsService.assertParticipant(chatId, userId);

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    return messages.reverse().map((m: any) => this.serialize(m));
  }

  async updateMessage(messageId: string, userId: string, text: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Not your message');

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { text, isEdited: true },
    });

    const serialized = this.serialize(updated);
    this.realtime.emitToChat(updated.chatId, 'message:update', serialized);
    return serialized;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Not your message');

    const deleted = await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), text: '' },
    });

    const serialized = this.serialize(deleted);
    this.realtime.emitToChat(deleted.chatId, 'message:delete', serialized);
    return serialized;
  }

  async markRead(chatId: string, userId: string) {
    await this.chatsService.assertParticipant(chatId, userId);
    await this.prisma.message.updateMany({
      where: { chatId, senderId: { not: userId }, status: { not: 'READ' } },
      data: { status: 'READ' },
    });

    this.realtime.emitToChat(chatId, 'chat:read', { chatId, readBy: userId });
    return { success: true };
  }

  async getMessageChatId(messageId: string): Promise<string | null> {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    return message?.chatId ?? null;
  }
}
