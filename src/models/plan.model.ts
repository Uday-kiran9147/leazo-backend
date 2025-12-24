import mongoose, { Schema, Document } from "mongoose";

export enum UserType {
  OWNER = "Owner",
  TENANT = "Tenant",
}

export interface IPlan extends Document {
  name: string;
  userType: UserType;
  price: number;
  durationDays?: number | null;
  features: string[];
  isActive: boolean;
}


const planSchema = new Schema<IPlan>(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    userType: {
      type: String,
      enum: Object.values(UserType),
      required: true,
    },
    price: { type: Number, required: true },
    durationDays: { type: Number, default: null },
    features: { type: [String], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, _id: false }
);

planSchema.index({ name: 1, userType: 1 }, { unique: true });

export const Plan = mongoose.model<IPlan>("Plan", planSchema);
