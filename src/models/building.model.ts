import mongoose from "mongoose";

export const addressSchema = {
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    locality: { type: String, required: true },
    zipCode: { type: String, required: true },
    latitude: { type: String },
    longitude: { type: String }
};

// Contact Schema
export const contactSchema = {
    countryCode: { type: String, required: true },
    phoneNumber: { type: String, required: true }
};


interface IBuildingMethods{
    updateOwner(ownerId:string):Promise<void>;
}


interface IBuilding extends mongoose.Document, IBuildingMethods {
    _id: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    address: any;
    buildingName: string;
    contact: any;
    imageUrl: string;
    availabilityStatus: string;
    floors: number;
    parking: boolean;
    amenities: string[];
}

interface IBuildingModel extends mongoose.Model<IBuilding>{}


// Building Schema
const buildingSchema = new mongoose.Schema<IBuilding>(
    {
        // _id:{type:mongoose.Schema.Types.ObjectId},
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
// Cascade delete portions when a building is deleted
buildingSchema.pre('deleteMany', async function(next) {
    const building = await this.model.findOne(this.getQuery());
    if (building) {
        // Ensure portions are deleted before the building
        await mongoose.model('Portion').deleteMany({ buildingId: building._id });
    }
    next();
});

// findOneAndDelete
buildingSchema.pre('findOneAndDelete', async function(next) {
    const building = await this.model.findOne(this.getQuery());
    if (building) {
        // Ensure portions are deleted before the building
        await mongoose.model('Portion').deleteMany({ buildingId: building._id });
    }
    next();
}
);
export const Building = mongoose.model<IBuilding,IBuildingModel>("Building", buildingSchema);