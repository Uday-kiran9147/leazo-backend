export interface IPaymentStrategy {
   getCheckoutSession(paymentId:string, productId:string,customerId:string,email:string,name:string): Promise<string>;
}