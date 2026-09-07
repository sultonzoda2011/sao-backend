import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CloudinaryService } from '../common/cloudinary.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, CloudinaryService],
  exports: [UsersService],
})
export class UsersModule {}
