"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var rooms_1 = require("../../data/rooms");
var users_1 = require("../../data/users");
var users_2 = require("../../data/users");
/**
 * Websocket controller to handle emitting events on a given socket.
 */
var WebSocketController = {
    emitToken: function (sock, token) {
        sock.send(JSON.stringify({
            event: "token",
            payload: {
                token: token
            }
        }));
    },
    emitCredentials: function (sock, creds) {
        sock.send(JSON.stringify({
            event: "credentials",
            payload: creds
        }));
    },
    emitRoomIndex: function (sock, roomIndex) {
        sock.send(JSON.stringify({
            event: "room/index",
            payload: {
                rooms: roomIndex
            }
        }));
    },
    emitRoomInfo: function (sock, roomInfo) {
        sock.send(JSON.stringify({
            event: "room/info",
            payload: {
                room: roomInfo
            }
        }));
    },
    emitUserList: function (sock, users) {
        sock.send(JSON.stringify({
            event: "user/index",
            payload: {
                users: users
            }
        }));
    },
    emitRoomMessage: function (sock, room, message) {
        sock.send(JSON.stringify({
            event: "room/message",
            payload: {
                room: room,
                message: message
            }
        }));
    },
    emitRoomHistory: function (sock, room, messages) {
        sock.send(JSON.stringify({
            event: "room/history",
            payload: {
                room: room,
                history: messages
            }
        }));
    },
    createRoomMessage: function (sock, payload) {
        // We need to send the message to all the users subscribed to the channel.
        var user = users_2.getUUIDBySocket(sock);
        if (!user) {
            console.error("[createRoomMessage] Invalid user");
            return;
        }
        rooms_1.publishMessage(user, payload);
    },
    setStreamState: function (sock, payload) {
        var room = payload.room, state = payload.state;
        var uuid = users_2.getUUIDBySocket(sock);
        if (!uuid || !state || !room)
            return;
        rooms_1.setUserStreamState(room, uuid, state);
    },
    setStreams: function (sock, payload) {
        var room = payload.room, streams = payload.streams;
        var uuid = users_2.getUUIDBySocket(sock);
        if (!uuid || !streams || !room)
            return;
        rooms_1.setUserStreams(room, uuid, streams);
    },
    // Router for user-generated messages
    messageRouter: function (message) {
        var _a = JSON.parse(message), event = _a.event, payload = _a.payload;
        if (event === "room/createmessage") {
            WebSocketController.createRoomMessage(this, payload);
        }
        else if (event === "ping") {
            this.send(JSON.stringify({ event: "pong" }));
        }
        else if (event === "room/deletemessage") {
        }
        else if (event === "room/setstreamstate") {
            WebSocketController.setStreamState(this, payload);
        }
        else if (event === "room/setstreams") {
            WebSocketController.setStreams(this, payload);
        }
        else if (event === "rtc/offer") {
            var ts = users_1.getSocketByUUID(payload.target);
            ts === null || ts === void 0 ? void 0 : ts.send(message);
        }
        else if (event === "rtc/answer") {
            var ts = users_1.getSocketByUUID(payload.target);
            ts === null || ts === void 0 ? void 0 : ts.send(message);
        }
        else if (event === "rtc/icecandidate") {
            var ts = users_1.getSocketByUUID(payload.target);
            ts === null || ts === void 0 ? void 0 : ts.send(message);
        }
        else if (event === "rtc/renegotiation") {
            var ts = users_1.getSocketByUUID(payload.target);
            ts === null || ts === void 0 ? void 0 : ts.send(message);
        }
        else if (event === "rtc/answerrenegotiation") {
            var ts = users_1.getSocketByUUID(payload.target);
            ts === null || ts === void 0 ? void 0 : ts.send(message);
        }
    }
};
exports.default = WebSocketController;
