import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertParticipant(chatId: string, userId: string) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!participant) throw new ForbiddenException('You are not a participant of this chat');
  }

  async getOrCreateDirectChat(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot start a chat with yourself');
    }

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('User not found');

    const existing = await this.prisma.chat.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
      include: { participants: true },
    });

    if (existing) return this.getChatById(existing.id, userId);

    const chat = await this.prisma.chat.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
    });

    return this.getChatById(chat.id, userId);
  }

  private async formatChat(chat: any, currentUserId: string) {
    const otherParticipant = chat.participants.find((p: any) => p.userId !== currentUserId)?.user;
    const lastMessage = chat.messages?.[0] ?? null;

    return {
      id: chat.id,
      isGroup: chat.isGroup,
      updatedAt: chat.updatedAt,
      peer: otherParticipant
        ? {
            id: otherParticipant.id,
            username: otherParticipant.username,
            displayName: otherParticipant.displayName,
            avatarUrl: otherParticipant.avatarUrl,
            isOnline: otherParticipant.isOnline,
            lastSeenAt: otherParticipant.lastSeenAt,
          }
        : null,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            text: lastMessage.deletedAt ? null : lastMessage.text,
            deleted: !!lastMessage.deletedAt,
            senderId: lastMessage.senderId,
            status: lastMessage.status,
            createdAt: lastMessage.createdAt,
          }
        : null,
    };
  }

  async getChatById(chatId: string, currentUserId: string) {
    await this.assertParticipant(chatId, currentUserId);
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: { include: { user: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!chat) throw new NotFoundException('Chat not found');
    return this.formatChat(chat, currentUserId);
  }

  async listChats(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(chats.map((chat: any) => this.formatChat(chat, userId)));
  }
}
