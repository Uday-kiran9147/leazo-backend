import { Injectable, OnModuleInit } from '@nestjs/common';
import { startPlanExpiryCron, processExpiredPlans } from '../../cron/planExpiryCron';
import { logger } from '../../utils/logger';

@Injectable()
export class CronService implements OnModuleInit {
  onModuleInit() {
    if (process.env.NODE_ENV !== 'test') {
      logger.info('Initializing NestJS background cron services...');
      startPlanExpiryCron();
    }
  }

  async runPlanExpiryCheck() {
    return processExpiredPlans();
  }
}
