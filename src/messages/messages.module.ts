import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { ChatsModule } from '../chats/chats.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ChatsModule, AuthModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
