import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { getOwnerPlans, getTenantPlans } from '../../controller/plans.Controller';

export interface IPlansService {
  getTenantPlans(req: Request, res: Response): Promise<any>;
  getOwnerPlans(req: Request, res: Response): Promise<any>;
}

@Injectable()
export class NestPlansService implements IPlansService {
  async getTenantPlans(req: Request, res: Response): Promise<any> {
    return getTenantPlans(req, res);
  }

  async getOwnerPlans(req: Request, res: Response): Promise<any> {
    return getOwnerPlans(req, res);
  }
}
