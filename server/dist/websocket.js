"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = __importDefault(require("ws"));
var users_1 = require("./data/users");
var rooms_1 = require("./data/rooms");
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var auth_1 = require("./middleware/auth");
var rooms_2 = require("./data/rooms");
var WebSocketController_1 = __importDefault(require("./controllers/ws/WebSocketController"));
var server = new ws_1.default.Server({ noServer: true });
server.on('connection', function (sock, req) {
    var _a = users_1.createUser(sock), uuid = _a.uuid, username = _a.username, avatar = _a.avatar;
    sock.on("message", WebSocketController_1.default.messageRouter);
    // Send the user their auth token to match their UUIDs.
    var token = jsonwebtoken_1.default.sign({ data: { uuid: uuid } }, auth_1.signature, { expiresIn: "6h" });
    WebSocketController_1.default.emitToken(sock, token);
    // Send the user their default credentials.
    WebSocketController_1.default.emitCredentials(sock, { username: username, avatar: avatar, uuid: uuid });
    // Send them the current room list
    WebSocketController_1.default.emitRoomIndex(sock, rooms_1.rooms);
    // Default user subscriptions
    rooms_2.subscribe("index", { socket: sock, uuid: uuid });
    var keepAlive = setInterval(function () {
        sock.send(JSON.stringify({ event: "ping" }));
    }, 30 * 1000);
    // When the socket closes, we want to remove them from the user entry list.
    sock.on('close', function () {
        // Unsubscribe from all room related stuff
        rooms_2.unsubscribeAll({ uuid: uuid, socket: sock });
        // Remove the user from all rooms
        rooms_2.leaveAll({ uuid: uuid, socket: sock });
        // Remove the user from the users list
        users_1.destroyUser(uuid);
        // Clear the keepalive pings
        clearInterval(keepAlive);
    });
});
exports.default = server;
