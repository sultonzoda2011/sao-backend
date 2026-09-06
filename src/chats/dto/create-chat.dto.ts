import { IsString } from 'class-validator';

export class CreateChatDto {
  // id of the other participant for a 1v1 chat
  @IsString()
  targetUserId!: string;
}
