import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { createOrder, verifyPayment, handleWebhook } from '../../controller/razorpay.controller';

export interface IPaymentsService {
  createOrder(req: Request, res: Response): Promise<any>;
  verifyPayment(req: Request, res: Response): Promise<any>;
  handleWebhook(req: Request, res: Response): Promise<any>;
}

@Injectable()
export class PaymentsService implements IPaymentsService {
  async createOrder(req: Request, res: Response): Promise<any> {
    return createOrder(req, res);
  }

  async verifyPayment(req: Request, res: Response): Promise<any> {
    return verifyPayment(req, res);
  }

  async handleWebhook(req: Request, res: Response): Promise<any> {
    return handleWebhook(req, res);
  }
}
