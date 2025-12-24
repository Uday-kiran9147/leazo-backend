import { Schema } from "mongoose";

// Address Interface
export interface IAddress {
  country: string;
  state: string;
  city: string;
  locality: string;
  zipCode: string;
  latitude?: string;
  longitude?: string;
}

// Address Schema
export const addressSchema = new Schema<IAddress>({
  country: { type: String, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  locality: { type: String, required: true },
  zipCode: { type: String, required: true },
  latitude: { type: String },
  longitude: { type: String }
}, { _id: false });

// Contact Interface
export interface IContact {
  countryCode: string;
  phoneNumber: string;
}

// Contact Schema
export const contactSchema = new Schema<IContact>({
  countryCode: { type: String, required: true },
  phoneNumber: { type: String, required: true }
}, { _id: false });
