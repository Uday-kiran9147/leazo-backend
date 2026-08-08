import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { NestUserService } from './users.service';
import { UserService } from '../../services/UserService';

@Module({
  controllers: [UsersController],
  providers: [NestUserService, UserService],
  exports: [NestUserService, UserService],
})
export class UsersModule {}
