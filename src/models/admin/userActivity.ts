import mongoose, { Document, Schema } from "mongoose";

// Activity Tracking Schema
interface IUserActivity extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  activityType: string;
  deviceInfo?: string;
  ipAddress?: string;
}

const userActivitySchema = new Schema<IUserActivity>({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  date: { 
    type: Date, 
    required: true,
    index: true,
    default: Date.now 
  },
  activityType: { 
    type: String, 
    required: true,
    enum: ['login', 'property_view', 'search', 'other'] 
  },
  deviceInfo: { type: String },
  ipAddress: { type: String }
}, {
  timestamps: true
});

// Indexes for faster queries
userActivitySchema.index({ userId: 1, date: 1 });
userActivitySchema.index({ date: 1 });

export const UserActivity = mongoose.model<IUserActivity>('UserActivity', userActivitySchema);