import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { MessagesModule } from '../messages/messages.module';
import { ChatsModule } from '../chats/chats.module';

@Module({
  imports: [JwtModule.register({}), MessagesModule, ChatsModule],
  providers: [ChatGateway],
})
export class GatewayModule {}
