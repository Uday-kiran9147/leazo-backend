"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var ApiError = /** @class */ (function (_super) {
    __extends(ApiError, _super);
    function ApiError(statusCode, message, stack) {
        if (stack === void 0) { stack = ''; }
        var _this = _super.call(this, message) || this;
        _this.statusCode = statusCode;
        _this.message = message;
        if (stack) {
            _this.stack = stack;
        }
        else {
            Error.captureStackTrace(_this, _this.constructor);
        }
        return _this;
    }
    return ApiError;
}(Error));
// Error handling function
var handleError = function (error) {
    if (error.response) {
        // The request was made and the server responded with a status code
        console.error('Error:', error.response.data);
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
    }
    else if (error.request) {
        // The request was made but no response was received
        console.error('Error: No response received', error.request);
    }
    else {
        // Something happened in setting up the request
        console.error('Error:', error.message);
    }
};
exports.default = ApiError;
