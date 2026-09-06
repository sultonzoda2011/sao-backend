import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  // accepts email OR username
  @IsString()
  login!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
