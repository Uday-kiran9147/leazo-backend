import mongoose from "mongoose";
import { addressSchema, contactSchema } from "./building.model";

// Accessable on the instances.
interface IPortionMethods {}

export enum ApprovalStatus {
    Review = "Review",
    Hold = "Hold",
    Approved = "Approved",
    Rejected = "Rejected",
  }
// Define the Portion document interface (combines fields with methods)
interface IPortion extends mongoose.Document, IPortionMethods {
    _id: mongoose.Types.ObjectId;
    buildingId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    portionNumber: string;
    floor: string;
    contact: any;
    address: any;
    title: string;
    description: string;
    price: number;
    images: string[];
    isActive: boolean;
    availabilityStatus: string;
    approvalStatus: String;
    amenities: string[];
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
      availabilityStatus: {
        type: String,
        required: true,
        enum: ["available", "not available"],
        index: true, // ✅ Add index
      },
      approvalStatus: {
        type: String,
        default: "Review", // ✅ Ensure this matches enum values
        enum: ["Review", "Hold", "Approved", "Rejected"],
        index: true, // ✅ Add index
      },
      amenities: [{ type: String }],
    },
    { timestamps: true }
  );  

export const Portion = mongoose.model<IPortion,IPortionModel>('Portion', portionSchema);