import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';

@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  list(@CurrentUser('sub') userId: string) {
    return this.chatsService.listChats(userId);
  }

  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateChatDto) {
    return this.chatsService.getOrCreateDirectChat(userId, dto.targetUserId);
  }

  @Get(':id')
  getOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.chatsService.getChatById(id, userId);
  }
}
