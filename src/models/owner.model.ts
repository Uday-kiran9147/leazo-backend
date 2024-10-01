
import mongoose from "mongoose"


// User -> userSchema -> IUser -> IUserMethods

// Owner methods
interface IOwnerMethods {
    
}

interface IOwner extends mongoose.Document, IOwnerMethods {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    ownerName: string;
    contactNumber: string;
    email: string;
}


interface IOwnerModel extends mongoose.Model<IOwner> {

}
// Owner Schema
var ownerSchema = new mongoose.Schema<IOwner>(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        ownerName: { type: String, required: true,trim:true },
        contactNumber: { type: String, required: true },
        email: { type: String, required: true,trim:true },
    },
    {
        timestamps: true
    }
);

export const Owner = mongoose.model<IOwner,IOwnerModel>('Owner', ownerSchema);