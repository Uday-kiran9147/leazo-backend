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
exports.User = void 0;
var mongoose_1 = require("mongoose");
var validator_1 = require("validator");
var bcrypt_1 = require("bcrypt");
var jsonwebtoken_1 = require("jsonwebtoken");
var console_1 = require("console");
var api_error_1 = require("../utils/api_error");
// User Schema
var userSchema = new mongoose_1.Schema({
    ownerId: { type: mongoose_1.default.Schema.Types.ObjectId, },
    token: { type: String },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: function (value) {
            if (!validator_1.default.isEmail(value)) {
                throw new api_error_1.default(400, "Invalid Email Address");
            }
        },
    },
    password: { type: String, required: true },
    phoneNumber: { type: String, },
    properties: [{ type: String }],
    deviceToken: { type: String },
    isOwner: { type: Boolean, default: false },
}, {
    timestamps: true
});
// Define instance method for generating auth token
userSchema.methods.generateAccessToken = function () {
    return __awaiter(this, void 0, void 0, function () {
        var user, secretKey, token;
        return __generator(this, function (_a) {
            user = this;
            secretKey = process.env.JWT_SECRET;
            if (!secretKey) {
                throw new api_error_1.default(400, "JWT Secret Key not found");
            }
            token = jsonwebtoken_1.default.sign({ _id: user._id.toString() }, secretKey);
            (0, console_1.log)("Token Generated", token);
            return [2 /*return*/, token];
        });
    });
};
// Generate Refresh token
// userSchema.methods.generateRefreshToken =async function () : Promise<string> {
//   return jwt.sign(this as IUser, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY });
// };
userSchema.methods.generateRefreshToken = function () {
    return __awaiter(this, void 0, void 0, function () {
        var user, secretKey, token;
        return __generator(this, function (_a) {
            user = this;
            secretKey = process.env.JWT_SECRET;
            if (!secretKey) {
                throw new api_error_1.default(400, "JWT Secret Key not found");
            }
            token = jsonwebtoken_1.default.sign({ _id: user._id.toString() }, secretKey, { expiresIn: "7d" });
            (0, console_1.log)("Token Generated", token);
            return [2 /*return*/, token];
        });
    });
};
// ! statics are accessible on the models and methods are accessible on the instances
// Define static method for finding user by credentials
userSchema.statics.findByCredentials = function (email, password) {
    return __awaiter(this, void 0, void 0, function () {
        var user, isMatch;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.User.findOne({ email: email })];
                case 1:
                    user = _a.sent();
                    if (!user) {
                        throw new api_error_1.default(404, "User not found");
                    }
                    return [4 /*yield*/, bcrypt_1.default.compare(password, user.password)];
                case 2:
                    isMatch = _a.sent();
                    if (!isMatch) {
                        throw new api_error_1.default(400, "Invalid login credentials");
                    }
                    return [2 /*return*/, user];
            }
        });
    });
};
// Pre-save hook for password hashing
userSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function () {
        var user, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    user = this;
                    if (!user.isModified('password')) return [3 /*break*/, 2];
                    // Hash the password with a salt round of 10
                    _a = user;
                    return [4 /*yield*/, bcrypt_1.default.hash(user.password, 10)];
                case 1:
                    // Hash the password with a salt round of 10
                    _a.password = _b.sent();
                    _b.label = 2;
                case 2:
                    next();
                    return [2 /*return*/];
            }
        });
    });
});
// Cascade delete owner when a user is deleted
userSchema.pre('findOneAndDelete', function (next) {
    return __awaiter(this, void 0, void 0, function () {
        var user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, this.model.findOne(this.getQuery())];
                case 1:
                    user = _a.sent();
                    if (!(user && user.ownerId)) return [3 /*break*/, 3];
                    return [4 /*yield*/, mongoose_1.default.model('Owner').findByIdAndDelete(user.ownerId)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    next();
                    return [2 /*return*/];
            }
        });
    });
});
// Export the User model
exports.User = mongoose_1.default.model("User", userSchema);
