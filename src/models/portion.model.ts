import mongoose from "mongoose";
import { addressSchema, contactSchema, IAddress, IContact } from "./common.schema";

// Accessable on the instances.
interface IPortionMethods {}

export enum ApprovalStatus {
    Review = "Review",
    Hold = "Hold",
    Approved = "Approved",
    Rejected = "Rejected",
}

// Define the Portion document interface (combines fields with methods)
export interface IPortion extends mongoose.Document, IPortionMethods {
    _id: mongoose.Types.ObjectId;
    buildingId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    portionNumber: string;
    floor: string;
  contact: IContact;
  address: IAddress;
    title: string;
    description: string;
    price: number;
    images: string[];
    isActive: boolean;
    isDeleted: boolean;
    availabilityStatus: string;
  approvalStatus: string;
  isBoosted: boolean;
  boostExpiresAt?: Date;
    amenities: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Define the static methods interface for the model
interface IPortionModel extends mongoose.Model<IPortion>{}


// Portion Schema
const portionSchema = new mongoose.Schema<IPortion>(
    {
      buildingId: { type: mongoose.Schema.Types.ObjectId, ref: "Building", required: true, index: true },
      ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", required: true, index: true },
      portionNumber: { type: String, required: true },
      floor: { type: String, required: true },
      contact: { type: contactSchema, required: true },
      address: { type: addressSchema, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
      price: { type: Number, required: true },
      images: [{ type: String }],
      isActive: { type: Boolean, default: true },
      isDeleted: {type: Boolean,default: false},
      availabilityStatus: {
        type: String,
        required: true,
        enum: ["available", "not available"],
        index: true,
      },
      approvalStatus: {
        type: String,
        default: "Review",
        enum: ["Review", "Hold", "Approved", "Rejected"],
        index: true,
      },
    isBoosted: { type: Boolean, default: false, index: true },
    boostExpiresAt: { type: Date },
      amenities: [{ type: String }],
    },
    { timestamps: true }
);  

// Text index for search
portionSchema.index({
    "address.state": "text",
    "address.country": "text",
    "address.city": "text",
    "address.locality": "text",
    title: "text",
    description: "text"
});

export const Portion = mongoose.model<IPortion, IPortionModel>('Portion', portionSchema);