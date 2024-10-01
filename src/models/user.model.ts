import mongoose, { Model, Schema, Document, Mongoose } from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { log, timeStamp } from "console";
import ApiError from "../utils/api_error";

// User -> userSchema -> IUser -> IUserMethods

// Define an interface for User instance methods
// Accessable on the instances.
interface IUserMethods {
  generateAuthToken(): Promise<string>;
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
  properties: string[];
  deviceToken?: string;
  isOwner: boolean;
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
        throw new Error("Invalid Email Address");
      }
    },
  },
  password: { type: String, required: true },
  phoneNumber: { type: String,},
  properties: [{ type: String }],
  deviceToken: { type: String },
  isOwner: { type: Boolean, default: false },
}, {
  timestamps: true
});

// Define instance method for generating auth token
userSchema.methods.generateAuthToken = async function (): Promise<string> {
  const user = this as IUser;
  const secretKey = process.env.JWT_SECRET as string;
  if (!secretKey) {
    throw new ApiError(400, "JWT Secret Key not found");
  }
  const token = jwt.sign({ _id: user._id.toString() }, secretKey);
  log("Token Generated", token);
  return token;
};

// ! statics are accessible on the models and methods are accessible on the instances
// Define static method for finding user by credentials
userSchema.statics.findByCredentials = async function (
  email: string,
  password: string
): Promise<IUser | null> {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Invalid login credentials");
  }

  // Compare the provided password with the hashed password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid login credentials");
  }

  return user;
};

// Pre-save hook for password hashing
userSchema.pre('save', async function (next) {
  const user = this as IUser;

  if (user.isModified('password')) {
    // Hash the password with a salt round of 10
    user.password = await bcrypt.hash(user.password, 10);
  }
  next();
});

// Export the User model
export const User = mongoose.model<IUser, IUserModel>("User", userSchema);
