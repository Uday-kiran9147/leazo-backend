import { z } from "zod";

// Address Schema Validation
export const addressSchema = z.object({
  country: z.string().min(1, "Country is required"),
  state: z.string().min(1, "State is required"),
  city: z.string().min(1, "City is required"),
  locality: z.string().min(1, "Locality is required"),
  zipCode: z.string().min(5, "Zip code should be at least 5 characters"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

// Contact Schema Validation
export const contactSchema = z.object({
  countryCode: z.string().min(1, "Country code is required"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
});