"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signature = void 0;
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var crypto_1 = __importDefault(require("crypto"));
exports.signature = crypto_1.default.randomBytes(20).toString('hex'); // Gonna generate the signature for the web token every time the server restarts.
function parseAuthToken(req) {
    if (req.headers.authorization)
        return req.headers.authorization;
    return "";
}
function default_1(req, res, next) {
    var token = parseAuthToken(req);
    return jsonwebtoken_1.default.verify(token, exports.signature, function (err, decoded) {
        if (err) {
            next(new Error("Invalid token"));
        }
        req.uuid = decoded.data.uuid;
        return next();
    });
}
exports.default = default_1;
