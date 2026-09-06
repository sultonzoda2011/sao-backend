import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('chats/:chatId/messages')
  getHistory(
    @CurrentUser('sub') userId: string,
    @Param('chatId') chatId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.getHistory(chatId, userId, cursor, limit ? Number(limit) : 30);
  }

  @Post('chats/:chatId/messages')
  create(
    @CurrentUser('sub') userId: string,
    @Param('chatId') chatId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createMessage(chatId, userId, dto.text);
  }

  @Post('chats/:chatId/read')
  markRead(@CurrentUser('sub') userId: string, @Param('chatId') chatId: string) {
    return this.messagesService.markRead(chatId, userId);
  }

  @Patch('messages/:id')
  update(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: UpdateMessageDto) {
    return this.messagesService.updateMessage(id, userId, dto.text);
  }

  @Delete('messages/:id')
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.messagesService.deleteMessage(id, userId);
  }
}
