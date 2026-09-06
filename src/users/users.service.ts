import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { CloudinaryService } from '../common/cloudinary.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private toPublicUser(user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    isOnline: boolean;
    lastSeenAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      isOnline: user.isOnline,
      lastSeenAt: user.lastSeenAt,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.toPublicUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.username) {
      const existing = await this.prisma.user.findFirst({
        where: { username: dto.username, NOT: { id: userId } },
      });
      if (existing) throw new ConflictException('Username already taken');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
        bio: dto.bio,
        username: dto.username,
      },
    });
    return this.toPublicUser(user);
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { success: true };
  }

  async updateAvatar(userId: string, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const result = await this.cloudinary.uploadImageBuffer(file.buffer);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: result.secure_url },
    });
    return this.toPublicUser(user);
  }

  async searchUsers(currentUserId: string, query: string, saveHistory: boolean) {
    const users = await this.prisma.user.findMany({
      where: {
        NOT: { id: currentUserId },
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
      },
    });

    if (saveHistory && query.trim().length > 0) {
      await this.prisma.searchHistory.create({
        data: { userId: currentUserId, query: query.trim() },
      });
    }

    return users;
  }

  async getSearchHistory(userId: string) {
    const history = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      distinct: ['query'],
    });
    return history;
  }

  async clearSearchHistory(userId: string) {
    await this.prisma.searchHistory.deleteMany({ where: { userId } });
    return { success: true };
  }

  async deleteSearchHistoryItem(userId: string, id: string) {
    await this.prisma.searchHistory.deleteMany({ where: { id, userId } });
    return { success: true };
  }
}
