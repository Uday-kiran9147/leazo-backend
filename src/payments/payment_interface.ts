export interface IPaymentStrategy {
   getCheckoutSession(productId:string,customerId:string,email:string,name:string): Promise<string>;
}