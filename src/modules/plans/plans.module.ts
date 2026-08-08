import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { NestPlansService } from './plans.service';
import { PlanService } from '../../services/PlanService';

@Module({
  controllers: [PlansController],
  providers: [NestPlansService, PlanService],
  exports: [NestPlansService, PlanService],
})
export class PlansModule {}
