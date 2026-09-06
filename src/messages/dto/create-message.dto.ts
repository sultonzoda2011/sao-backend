import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  chatId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text!: string;
}
