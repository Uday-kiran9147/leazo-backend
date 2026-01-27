import mongoose from "mongoose";
import { addressSchema, contactSchema, IAddress, IContact } from "./common.schema";

interface IBuildingMethods {
    updateOwner(ownerId: string): Promise<void>;
}

export interface IBuilding extends mongoose.Document, IBuildingMethods {
    _id: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    address: IAddress;
    buildingName: string;
    contact: IContact;
    imageUrl?: string;
    availabilityStatus: string;
    floors: number;
    parking: boolean;
    amenities: string[];
}

interface IBuildingModel extends mongoose.Model<IBuilding> { }

// Building Schema
const buildingSchema = new mongoose.Schema<IBuilding>(
    {
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true, index: true },
        address: { type: addressSchema, required: true },
        buildingName: { type: String, required: true },
        contact: { type: contactSchema, required: true },
        imageUrl: { type: String },
        availabilityStatus: { type: String, required: true },
        floors: { type: Number, required: true },
        parking: { type: Boolean, required: true },
        amenities: [{ type: String }]
    },
    { timestamps: true }
);

// Cascade delete portions when a building is deleted
buildingSchema.pre('deleteMany', async function () {
    const building = await this.model.findOne(this.getQuery());
    if (building) {
        await mongoose.model('Portion').deleteMany({ buildingId: building._id });
    }
});

buildingSchema.pre('findOneAndDelete', async function () {
    const building = await this.model.findOne(this.getQuery());
    if (building) {
        await mongoose.model('Portion').deleteMany({ buildingId: building._id });
    }
});

export const Building = mongoose.model<IBuilding, IBuildingModel>("Building", buildingSchema);