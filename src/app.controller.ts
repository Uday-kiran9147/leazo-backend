import { Controller, Get, Query, Res, BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { PaymentEntity } from './payments/payments.models';
import { logger } from './utils/logger';

@Controller()
export class AppController {
  @Get()
  getWelcome() {
    return { Leazo: 'Welcome to LeazOOOOOOOOOO!' };
  }

  @Get(['api/subscription-status', 'v1/api/subscription-status'])
  async getSubscriptionStatus(
    @Query('internal_payment_id') internalPaymentId: string,
    @Res() res: Response
  ) {
    if (!internalPaymentId) {
      return res.status(400).json({ error: 'internal_payment_id required' });
    }

    const record = await PaymentEntity.findById(internalPaymentId);
    if (!record) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    logger.debug('Payment record fetched', { id: record._id, status: record.status });
    return res.json({
      status: record.status,
      subscription_id: record.gatewaySubscriptionId ?? null,
    });
  }
}
