import mongoose, { Model, Schema, Document, Mongoose } from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { log, timeStamp } from "console";
import ApiError from "../utils/api_error";
import { UserActivity } from "./admin/userActivity";
import { BackgroundService } from "../utils/BackgroundService";

// User -> userSchema -> IUser -> IUserMethods

// Define an interface for User instance methods
// Accessable on the instances.
interface IUserMethods {
  generateAccessToken(): Promise<string>;
  trackActivity(activityType: string, deviceInfo?: string, ipAddress?: string): Promise<void>;
}

// Define the User document interface (combines fields with methods)
interface IUser extends Document, IUserMethods {
  _id: mongoose.Types.ObjectId;
  token: string;
  ownerId?: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  deviceToken?: string;
  role?: string;
  isOwner: boolean;

  // Subscription fields (User/Tenant)
  planId: "tenant_free" | "tenant_smart_finder" | "tenant_premium";
  subscriptionId?: string;
  planActivatedAt?: Date;
  planExpiresAt?: Date;
  usage: {
    ownerContactsUsed: number;
  };
  autoRenew: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

// Define the static methods interface for the model
interface IUserModel extends Model<IUser> {
  findByCredentials(email: string, password: string): Promise<IUser | null>;
}

// User Schema
const userSchema = new Schema<IUser>({
  ownerId: { type: mongoose.Schema.Types.ObjectId, },
  token: { type: String },
  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: (value: string) => {
      if (!validator.isEmail(value)) {
        throw new mongoose.Error.ValidationError(
        );
      }
    },
  },
  password: { type: String, required: true },
  phoneNumber: { type: String, },
  deviceToken: { type: String },
  isOwner: { type: Boolean, default: false },
  role: { type: String, default: "User" },

  // Subscription fields
  planId: {
    type: String,
    enum: ["tenant_free", "tenant_smart_finder", "tenant_premium"],
    default: "tenant_free"
  },
  subscriptionId: { type: String },
  planActivatedAt: { type: Date, default: Date.now },
  planExpiresAt: { type: Date },
  usage: {
    ownerContactsUsed: { type: Number, default: 0 }
  },
  autoRenew: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, {
  timestamps: true
});
userSchema.methods.trackActivity = async function(
  activityType: string, 
  deviceInfo?: string, 
  ipAddress?: string
): Promise<void> {
  const user = this as IUser;
  BackgroundService.trackActivity(user._id.toString(), activityType, deviceInfo, ipAddress);
};
// Define instance method for generating auth token
userSchema.methods.generateAccessToken = async function (): Promise<string> {
  const user = this as IUser;
  const secretKey = process.env.JWT_SECRET as string;
  if (!secretKey) {
    throw new ApiError(400, "JWT Secret Key not found");
  }
  const token = jwt.sign({ _id: user._id.toString() }, secretKey);
  return token;
};

// Generate Refresh token
// userSchema.methods.generateRefreshToken =async function () : Promise<string> {
//   return jwt.sign(this as IUser, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY });
// };
userSchema.methods.generateRefreshToken = async function (): Promise<string> {
  const user = this as IUser;
  const secretKey = process.env.JWT_SECRET as string;
  if (!secretKey) {
    throw new ApiError(400, "JWT Secret Key not found");
  }
  const token = jwt.sign({ _id: user._id.toString() }, secretKey, { expiresIn: "7d" });
  // log("Token Generated", token);
  return token;
}

// ! statics are accessible on the models and methods are accessible on the instances
// Define static method for finding user by credentials
userSchema.statics.findByCredentials = async function (
  email: string,
  password: string
): Promise<IUser | null> {
  const user = await User.findOne({ email });

  // If no user is found, throw an API error
  if (!user) {
    throw new ApiError(404, "No user matches the provided details.");
  }

  // Compare the provided password with the hashed password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(400, "The password you entered is incorrect. Please try again."); // Throw the error if the password is incorrect
  }

  return user; // Return the user if the email and password match
};

// Pre-save hook for password hashing
userSchema.pre('save', async function () {
  const user = this as IUser;

  if (user.isModified('password')) {
    // Hash the password with a salt round of 10
    user.password = await bcrypt.hash(user.password, 10);
  }
});

// Cascade delete owner when a user is deleted
userSchema.pre('findOneAndDelete', async function () {
  const user = await this.model.findOne(this.getQuery());
  if (user && user.ownerId) {
    await mongoose.model('Owner').findByIdAndDelete(user.ownerId);
  }
});
// Export the User model
export const User = mongoose.model<IUser, IUserModel>("User", userSchema);
