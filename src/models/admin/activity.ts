import mongoose, { Document, Schema } from "mongoose";

// Daily Active Users (DAU) - Pre-aggregated
interface IDailyActiveUser extends Document {
    userId: mongoose.Types.ObjectId;
    date: Date;
  }
  
  const dailyActiveUserSchema = new Schema<IDailyActiveUser>({
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    date: { 
      type: Date, 
      required: true,
      index: true 
    }
  });
  
  dailyActiveUserSchema.index({ userId: 1, date: 1 }, { unique: true });
  
  export const DailyActiveUser = mongoose.model<IDailyActiveUser>('DailyActiveUser', dailyActiveUserSchema);
  
  // Monthly Active Users (MAU) - Pre-aggregated
  interface IMonthlyActiveUser extends Document {
    userId: mongoose.Types.ObjectId;
    year: number;
    month: number;
  }
  
  const monthlyActiveUserSchema = new Schema<IMonthlyActiveUser>({
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    year: { 
      type: Number, 
      required: true,
      index: true 
    },
    month: { 
      type: Number, 
      required: true,
      min: 1,
      max: 12,
      index: true 
    }
  });
  
  monthlyActiveUserSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });
  
  export const MonthlyActiveUser = mongoose.model<IMonthlyActiveUser>('MonthlyActiveUser', monthlyActiveUserSchema);
  
  // Yearly Active Users (YAU) - Pre-aggregated
  interface IYearlyActiveUser extends Document {
    userId: mongoose.Types.ObjectId;
    year: number;
  }
  
  const yearlyActiveUserSchema = new Schema<IYearlyActiveUser>({
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    year: { 
      type: Number, 
      required: true,
      index: true 
    }
  });
  
  yearlyActiveUserSchema.index({ userId: 1, year: 1 }, { unique: true });
  
  export const YearlyActiveUser = mongoose.model<IYearlyActiveUser>('YearlyActiveUser', yearlyActiveUserSchema);