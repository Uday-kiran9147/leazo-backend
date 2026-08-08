import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { NestPlansService } from './plans.service';

@Controller(['v1/api/plans', 'api/plans'])
export class PlansController {
  constructor(private readonly plansService: NestPlansService) {}

  @Get('tenant')
  async handleGetTenantPlans(@Req() req: Request, @Res() res: Response) {
    return this.plansService.getTenantPlans(req, res);
  }

  @Get('owner')
  async handleGetOwnerPlans(@Req() req: Request, @Res() res: Response) {
    return this.plansService.getOwnerPlans(req, res);
  }
}
