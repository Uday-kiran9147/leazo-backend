
import mongoose from "mongoose"
import { contactSchema } from "./building.model";


// User -> userSchema -> IUser -> IUserMethods

// Owner methods
interface IOwnerMethods {
    
}

interface IOwner extends mongoose.Document, IOwnerMethods {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    ownerName: string;
    contactNumber: any;
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
        await mongoose.model('Building').deleteMany({ ownerId: owner._id });
    }
    next();
  });

export const Owner = mongoose.model<IOwner,IOwnerModel>('Owner', ownerSchema);