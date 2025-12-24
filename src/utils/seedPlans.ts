import mongoose from "mongoose";
import dotenv from "dotenv";
import { Plan, UserType } from "../models/plan.model";
import {
  OWNER_PLAN_LIMITS,
  TENANT_PLAN_LIMITS,
} from "../config/plans";

dotenv.config();

const seedPlans = async () => {
  try {
    const url = process.env.DB_URL;
    const databaseName = "/leazo";

    if (!url) {
      console.error("DB_URL is not defined");
      process.exit(1);
    }

    await mongoose.connect(url + databaseName);

    const OwnerPlans = OWNER_PLAN_LIMITS.map((plan) => {
      return {
        id: plan.id,
        name: plan.name,
        userType: plan.userType,
        price: plan.price,
        durationDays: plan.durationDays,
        features: plan.features,
        isActive: plan.isActive,
      };
    });

    const TenantPlans = TENANT_PLAN_LIMITS.map((plan) => {
      return {
        id: plan.id,
        name: plan.name,
        userType: plan.userType,
        price: plan.price,
        durationDays: plan.durationDays,
        features: plan.features,
        isActive: plan.isActive,
      };
    });

    const allPlans = [...OwnerPlans, ...TenantPlans];

    for (const plan of allPlans) {
      await Plan.findOneAndUpdate(
        { id: plan.id},
        plan,
        { upsert: true, new: true }
      );
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedPlans();
