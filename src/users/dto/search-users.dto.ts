import { IsOptional, IsString, MinLength } from 'class-validator';

export class SearchUsersDto {
  @IsString()
  @MinLength(1)
  q!: string;

  @IsOptional()
  @IsString()
  saveHistory?: string; // "true" | "false", query params come as strings
}
