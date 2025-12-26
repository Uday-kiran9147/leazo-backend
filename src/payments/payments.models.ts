import mongoose, { Schema } from "mongoose";

export interface IPayment {
  _id?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  gateway: "dodo" | "juspay";
  gatewayPaymentId?: string;
  gatewaySessionId?: string;

  settlementAmount?: number;
  totalAmount?: number;
  currency: string;

  paymentMethod?: string;

  status: string;

  purpose: string;
  metadata?: Record<string, any>;
}

const paymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Users", required: true },

    gateway: { type: String, required: true },
    gatewayPaymentId: { type: String },
    gatewaySessionId: { type: String },

    settlementAmount: { type: Number },
    totalAmount: { type: Number },
    currency: { type: String, default: "INR" },

    paymentMethod: { type: String },

    status: {
      type: String,
      default: "created"
    },

    purpose: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payments", paymentSchema);
