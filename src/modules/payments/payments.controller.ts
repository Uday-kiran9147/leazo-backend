import { Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';

@Controller(['v1/api/payments', 'api/payments'])
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('razorpay/create-order')
  @UseGuards(JwtAuthGuard)
  async handleCreateOrder(@Req() req: Request, @Res() res: Response) {
    return this.paymentsService.createOrder(req, res);
  }

  @Post('razorpay/verify-payment')
  @UseGuards(JwtAuthGuard)
  async handleVerifyPayment(@Req() req: Request, @Res() res: Response) {
    return this.paymentsService.verifyPayment(req, res);
  }
}

@Controller(['v1/api/webhooks', 'api/webhooks'])
export class WebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('razorpay')
  async handleRazorpayWebhook(@Req() req: Request, @Res() res: Response) {
    return this.paymentsService.handleWebhook(req, res);
  }
}
