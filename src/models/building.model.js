"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Building = exports.contactSchema = exports.addressSchema = void 0;
var mongoose_1 = require("mongoose");
exports.addressSchema = new mongoose_1.default.Schema({
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    locality: { type: String, required: true },
    zipCode: { type: String, required: true },
    latitude: { type: String },
    longitude: { type: String }
});
// Contact Schema
exports.contactSchema = new mongoose_1.default.Schema({
    countryCode: { type: String, required: true },
    phoneNumber: { type: String, required: true }
});
// Building Schema
var buildingSchema = new mongoose_1.default.Schema({
    // _id:{type:mongoose.Schema.Types.ObjectId},
    ownerId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Owner', required: true },
    address: { type: exports.addressSchema, required: true },
    buildingName: { type: String, required: true },
    contact: { type: exports.contactSchema, required: true },
    imageUrl: { type: String },
    availabilityStatus: { type: String, required: true },
    floors: { type: Number, required: true },
    parking: { type: Boolean, required: true },
    amenities: [{ type: String }]
}, { timestamps: true });
// Cascade delete portions when a building is deleted
// Cascade delete portions when a building is deleted
buildingSchema.pre('deleteMany', function (next) {
    return __awaiter(this, void 0, void 0, function () {
        var building;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, this.model.findOne(this.getQuery())];
                case 1:
                    building = _a.sent();
                    if (!building) return [3 /*break*/, 3];
                    // Ensure portions are deleted before the building
                    return [4 /*yield*/, mongoose_1.default.model('Portion').deleteMany({ buildingId: building._id })];
                case 2:
                    // Ensure portions are deleted before the building
                    _a.sent();
                    _a.label = 3;
                case 3:
                    next();
                    return [2 /*return*/];
            }
        });
    });
});
exports.Building = mongoose_1.default.model("Building", buildingSchema);
