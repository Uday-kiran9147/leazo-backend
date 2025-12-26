import { IPaymentStrategy } from "./payment_interface";
export class PaymentContext {
    private strategy:IPaymentStrategy;

    constructor(strategy: IPaymentStrategy) {
        this.strategy = strategy;
    }

    async getCheckoutSession(paymentId:string,productId:string,customerId:string,email:string,name:string): Promise<string> {
        return await this.strategy.getCheckoutSession(paymentId,productId,customerId,email,name,);
    }
}