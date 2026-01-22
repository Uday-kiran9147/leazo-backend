import mongoose, { Schema } from "mongoose";

export interface IPayment extends mongoose.Document{
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  gateway: "juspay" | "razorpay";
  gatewayPaymentId?: string;
  gatewaySessionId?: string;
  gatewaySubscriptionId?: string;

  settlementAmount?: number;
  totalAmount?: number;
  currency: string;

  paymentMethod?: string;

  status: string;

  planId: string;
  metadata?: Record<string, any>;
}

interface IPaymentModel extends mongoose.Model<IPayment> {}

const paymentSchema = new Schema<IPayment>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },

    gateway: { type: String, required: true },
    gatewayPaymentId: { type: String },
    gatewaySessionId: { type: String },
    gatewaySubscriptionId: { type: String },

    settlementAmount: { type: Number },
    totalAmount: { type: Number },
    currency: { type: String, default: "INR" },

    paymentMethod: { type: String },

    status: {
      type: String,
      default: "initiated",
    },

    planId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const PaymentEntity = mongoose.model<IPayment,IPaymentModel>("Payment", paymentSchema);
