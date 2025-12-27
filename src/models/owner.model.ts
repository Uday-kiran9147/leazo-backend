import mongoose from "mongoose"
import { contactSchema, IContact } from "./common.schema";

// Owner methods
interface IOwnerMethods {
    
}

export interface IOwner extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  ownerName: string;
  contactNumber: IContact;
  email: string;
  subscriptionId?: string;

  planId: "owner_free" | "owner_starter" | "owner_pro" | "owner_ultra";
  planActivatedAt: Date;
  planExpiresAt?: Date;

  usage: {
    activeListings: number;
    weeklyBoostsUsed: number;
    tenantContactsUsed: number;
  };

  verifiedBadge: boolean;
  visibility: "basic" | "enhanced" | "high" | "top";

  autoRenew: boolean;
}


interface IOwnerModel extends mongoose.Model<IOwner> {

}

// Owner Schema
const ownerSchema = new mongoose.Schema<IOwner>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    ownerName: { type: String, required: true, trim: true },
    contactNumber: { type: contactSchema, required: true },
    email: { type: String, required: true, trim: true },
    subscriptionId: { type: String },

    planId: {
      type: String,
      enum: ["owner_free", "owner_starter", "owner_pro", "owner_ultra"],
      default: "owner_free"
    },

    planActivatedAt: {
      type: Date,
      default: Date.now
    },

    planExpiresAt: {
      type: Date
    },

    usage: {
      activeListings: { type: Number, default: 0 },
      weeklyBoostsUsed: { type: Number, default: 0 },
      tenantContactsUsed: { type: Number, default: 0 }
    },

    verifiedBadge: {
      type: Boolean,
      default: false
    },

    visibility: {
      type: String,
      enum: ["basic", "enhanced", "high", "top"],
      default: "basic"
    },

    autoRenew: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);


// Cascade delete buildings when an owner is deleted
ownerSchema.pre('findOneAndDelete', async function(next) {
    const owner = await this.model.findOne(this.getQuery());
    if (owner) {
        // Breaking cycle by using model name instead of direct import
        await mongoose.model('Building').deleteMany({ ownerId: owner._id });

        // Ensure the User is updated to reflect they are no longer an owner
        await mongoose.model('User').findByIdAndUpdate(owner.userId, {
            $set: { isOwner: false, ownerId: null }
        });
    }
    next();
  });

export const Owner = mongoose.model<IOwner,IOwnerModel>('Owner', ownerSchema);