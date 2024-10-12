"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Portion = void 0;
var mongoose_1 = require("mongoose");
var building_model_1 = require("./building.model");
// Portion Schema
var portionSchema = new mongoose_1.default.Schema({
    // _id:{type:mongoose.Schema.Types.ObjectId},
    buildingId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Building', required: true },
    ownerId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Owner', required: true },
    portionNumber: { type: String, required: true },
    floor: { type: String, required: true },
    contact: { type: building_model_1.contactSchema, required: true },
    address: { type: building_model_1.addressSchema, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
    availabilityStatus: { type: String, required: true, enum: ['available', 'not available'] }
});
exports.Portion = mongoose_1.default.model('Portion', portionSchema);
