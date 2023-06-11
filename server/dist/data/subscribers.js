"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriber = void 0;
var users_1 = __importDefault(require("../data/users"));
var users_2 = require("../data/users");
function getSubscriber(uuid) {
    if (users_1.default[uuid])
        return { uuid: uuid, socket: users_2.sockets[uuid] };
    return undefined;
}
exports.getSubscriber = getSubscriber;
