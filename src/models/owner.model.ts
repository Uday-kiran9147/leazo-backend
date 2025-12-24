import mongoose from "mongoose"
import { contactSchema, IContact } from "./common.schema";

// Owner methods
interface IOwnerMethods {
    
}

export interface IOwner extends mongoose.Document, IOwnerMethods {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    ownerName: string;
    contactNumber: IContact;
    email: string;
}

interface IOwnerModel extends mongoose.Model<IOwner> {

}

// Owner Schema
var ownerSchema = new mongoose.Schema<IOwner>(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        ownerName: { type: String, required: true,trim:true },
        contactNumber: { type: contactSchema, required: true },
        email: { type: String, required: true,trim:true },
    },
    {
        timestamps: true
    }
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