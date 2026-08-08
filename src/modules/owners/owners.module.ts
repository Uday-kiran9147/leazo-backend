import { Module } from '@nestjs/common';
import { OwnersController } from './owners.controller';
import { NestOwnersService } from './owners.service';
import { OwnerService } from '../../services/OwnerService';
import { BuildingService } from '../../services/BuildingService';
import { PortionService } from '../../services/PortionService';

@Module({
  controllers: [OwnersController],
  providers: [NestOwnersService, OwnerService, BuildingService, PortionService],
  exports: [NestOwnersService, OwnerService, BuildingService, PortionService],
})
export class OwnersModule {}
