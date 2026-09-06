import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { imageMemoryMulterOptions } from '../common/multer-memory.config';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser('sub') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  updateProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('me/password')
  updatePassword(@CurrentUser('sub') userId: string, @Body() dto: UpdatePasswordDto) {
    return this.usersService.updatePassword(userId, dto);
  }

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', imageMemoryMulterOptions))
  updateAvatar(@CurrentUser('sub') userId: string, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.updateAvatar(userId, file);
  }

  @Get('search')
  search(
    @CurrentUser('sub') userId: string,
    @Query('q') q: string,
    @Query('saveHistory') saveHistory?: string,
  ) {
    return this.usersService.searchUsers(userId, q ?? '', saveHistory !== 'false');
  }

  @Get('search/history')
  getSearchHistory(@CurrentUser('sub') userId: string) {
    return this.usersService.getSearchHistory(userId);
  }

  @Delete('search/history')
  clearSearchHistory(@CurrentUser('sub') userId: string) {
    return this.usersService.clearSearchHistory(userId);
  }

  @Delete('search/history/:id')
  deleteSearchHistoryItem(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.usersService.deleteSearchHistoryItem(userId, id);
  }
}
