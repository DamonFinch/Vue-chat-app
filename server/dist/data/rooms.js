"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserStreams = exports.setUserStreamState = exports.publishMessage = exports.destroyMessage = exports.leaveAll = exports.leaveRoom = exports.joinRoom = exports.removeRoom = exports.createRoom = exports.unsubscribeAll = exports.unsubscribe = exports.subscribe = exports.passwords = exports.messages = exports.rooms = void 0;
var lodash_1 = require("lodash");
var lodash_2 = __importDefault(require("lodash"));
var WebSocketController_1 = __importDefault(require("../controllers/ws/WebSocketController"));
var users_1 = require("./users");
exports.rooms = {};
exports.messages = {};
// Split passwords from the rooms object so updating the users of room changes is simple.
exports.passwords = {};
var subscriptions = {
    index: new Array(),
    rooms: new Map()
};
/**
 * Publishes the update of the room index to subscribers.
 */
function publishIndexUpdate() {
    subscriptions.index.forEach(function (subscriber) {
        WebSocketController_1.default.emitRoomIndex(subscriber.socket, exports.rooms);
    });
}
function publishRoomUpdate(roomId) {
    var _a;
    (_a = subscriptions.rooms.get(roomId)) === null || _a === void 0 ? void 0 : _a.forEach(function (subscriber) {
        WebSocketController_1.default.emitRoomInfo(subscriber.socket, {
            id: roomId,
            room: exports.rooms[roomId]
        });
    });
}
/**
 * Publishes a leave room event to all users in the room so that they can clean up their connections with that user.
 * @param roomId Room ID
 * @param uuid User that left the room
 */
function publishLeaveRoom(roomId, uuid, userStreams) {
    var _a;
    (_a = subscriptions.rooms.get(roomId)) === null || _a === void 0 ? void 0 : _a.forEach(function (subscriber) {
        subscriber.socket.send(JSON.stringify({
            event: "room/leave",
            payload: {
                user: uuid,
                // Also send the streams owned by this user so we can clean that up too.
                streams: {
                    userMedia: userStreams.userMedia,
                    screenshare: userStreams.screenshare
                }
            }
        }));
    });
}
/**
 * Subscribe to the events of the room index or a specific room.
 * @param {string} key What type of subscription is it? [index, room]
 * @param {Subscriber} subscriber Subscriber data
 * @param {string} subkey Room key if we're subscribing to a room
 */
function subscribe(key, subscriber, subkey) {
    var _a;
    if (subkey === void 0) { subkey = ""; }
    // TODO - Check if the subscriber already exists.
    if (key === "index") {
        subscriptions.index.push(subscriber);
    }
    else if (key === "room" && subkey) {
        if (subscriptions.rooms.has(subkey)) {
            (_a = subscriptions.rooms.get(subkey)) === null || _a === void 0 ? void 0 : _a.push(subscriber);
        }
    }
}
exports.subscribe = subscribe;
/**
 * Unsubscribe from the events of the room index or a specific room.
 * @param {string} key What type of subscription is it? [index, room]
 * @param {Subscriber} subscriber Subscriber data
 * @param {string} subkey Room key if we're subscribing to a room
 */
function unsubscribe(key, subscriber, subkey) {
    if (subkey === void 0) { subkey = ""; }
    // TODO Make this less shit
    if (key === "index") {
        lodash_2.default.remove(subscriptions.index, function (sub) {
            if (sub.uuid === subscriber.uuid)
                return true;
            return false;
        });
    }
    else if (key === "room" && subkey) {
        lodash_2.default.remove(subscriptions.rooms.get(subkey), function (sub) {
            return sub.uuid === subscriber.uuid;
        });
    }
}
exports.unsubscribe = unsubscribe;
/**
 * Unsubscribes a user from all room related subscriptions.
 * @param {Subscriber} subscriber Subscriber info
 */
function unsubscribeAll(subscriber) {
    var e_1, _a;
    lodash_2.default.remove(subscriptions.index, function (sub) {
        if (sub.uuid === subscriber.uuid)
            return true;
        return false;
    });
    try {
        for (var _b = __values(subscriptions.rooms.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), key = _d[0], val = _d[1];
            lodash_2.default.remove(val, function (sub) {
                return sub.uuid === subscriber.uuid;
            });
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
exports.unsubscribeAll = unsubscribeAll;
/**
 *  Creates a new chatroom and notifies subscribers of the room index that a new room is available.
 * @param {RoomEntry} entry The RoomEntry containing the data of our room settings.
 * @param {string} password An optional room password.
 * @return {}
 */
function createRoom(entry, password) {
    // Create a new room with a unique ID, so we don't have any conflicts in room addresses
    var id = lodash_1.uniqueId();
    exports.rooms[id] = entry;
    // Track the password if it exist
    if (password)
        exports.passwords[id] = password;
    // Create the subscription object for this room so users can track it.
    subscriptions.rooms.set(id, []);
    // Now we need to update the subscribers.
    publishIndexUpdate();
    // Create the room's message store
    exports.messages[id] = [];
    // Create callback that destroys the room after 5 minutes of nobody being in the room
    var roomCheck = setInterval(function () {
        if (exports.rooms[id].users.length !== 0)
            return;
        // If 5 minutes have elapsed since any messages have been sent and nobody is in the room, we remove
        if (Date.now() - exports.rooms[id].lastActive > 5 * 1000 * 60) {
            removeRoom(id);
            clearInterval(roomCheck);
        }
    }, 5 * 1000 * 60);
    // Return the room & room id 
    return __assign(__assign({}, exports.rooms[id]), { id: id });
}
exports.createRoom = createRoom;
/**
 * Removes an inactive room, cleans up subscribers, and notifies users of the room index updating.
 * @param {string} roomId Room ID
 */
function removeRoom(roomId) {
    if (exports.rooms[roomId]) {
        // We should just be able to delete it since we only really delete when there's no users in it after some time period
        delete exports.rooms[roomId];
        delete exports.messages[roomId];
        // Clean up the subscribers of this channel
        subscriptions.rooms.delete(roomId);
        // Notify the peeps
        publishIndexUpdate();
    }
}
exports.removeRoom = removeRoom;
/**
 * Joins and subscribes a user to a specific room, then initiates webrtc contact with the other users.
 * @param {string} roomId Room ID
 * @param {Subscriber} subscriber Subscriber info
 */
function joinRoom(roomId, subscriber) {
    var e_2, _a, e_3, _b;
    var _c;
    try {
        // Let's first check if the user is in a room or has any room subscriptions, and leave them. 
        for (var _d = __values(Object.entries(exports.rooms)), _e = _d.next(); !_e.done; _e = _d.next()) {
            var _f = __read(_e.value, 2), key = _f[0], room = _f[1];
            if (room.users.includes(subscriber.uuid)) {
                // Then we need to unsub and remove from the room
                if (roomId !== key)
                    leaveRoom(key, subscriber);
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
        }
        finally { if (e_2) throw e_2.error; }
    }
    (_c = subscriptions.rooms.get(roomId)) === null || _c === void 0 ? void 0 : _c.push(subscriber);
    publishIndexUpdate();
    publishRoomUpdate(roomId);
    // We also need to send the user all the previous chat messages.
    WebSocketController_1.default.emitRoomHistory(subscriber.socket, roomId, exports.messages[roomId]);
    try {
        // Lastly we need to connect this user to the existing users.
        for (var _g = __values(exports.rooms[roomId].users), _h = _g.next(); !_h.done; _h = _g.next()) {
            var user = _h.value;
            if (subscriber.uuid === user)
                continue;
            // For every user already in the room
            // Get their socket and tell them to initiate contact with the new subscriber
            var sock = users_1.getSocketByUUID(user);
            sock === null || sock === void 0 ? void 0 : sock.send(JSON.stringify({
                event: "rtc/init",
                payload: {
                    target: subscriber.uuid,
                }
            }));
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
        }
        finally { if (e_3) throw e_3.error; }
    }
}
exports.joinRoom = joinRoom;
/**
 * Leaves and unsubscribes a user from a room.
 * @param {string} roomId Room ID
 * @param {Subscriber} subscriber Subscriber info
 */
function leaveRoom(roomId, subscriber) {
    unsubscribe("room", subscriber, roomId);
    var userStreams = exports.rooms[roomId].streams[subscriber.uuid];
    if (!userStreams) {
        userStreams = { userMedia: "", screenshare: "" };
    }
    lodash_2.default.remove(exports.rooms[roomId].users, function (user) { return user === subscriber.uuid; });
    delete exports.rooms[roomId].streams[subscriber.uuid];
    publishIndexUpdate();
    publishRoomUpdate(roomId);
    publishLeaveRoom(roomId, subscriber.uuid, userStreams);
}
exports.leaveRoom = leaveRoom;
/**
 * Leaves and unsubscribes a user from all rooms
 * @param {Subscriber} subscriber Subscriber info
 */
function leaveAll(subscriber) {
    var e_4, _a;
    var _loop_1 = function (key, val) {
        delete val.streams[subscriber.uuid];
        lodash_2.default.remove(val.users, function (sub) {
            if (sub === subscriber.uuid) {
                publishIndexUpdate();
                publishRoomUpdate(key);
            }
            return sub === subscriber.uuid;
        });
    };
    try {
        for (var _b = __values(Object.entries(exports.rooms)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), key = _d[0], val = _d[1];
            _loop_1(key, val);
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_4) throw e_4.error; }
    }
}
exports.leaveAll = leaveAll;
/**
 * Deletes a room message.
 * @param uuid Message uuid
 * @param userId User's uuid
 */
function destroyMessage(uuid, userId) {
}
exports.destroyMessage = destroyMessage;
/**
 * Publishes a room message to all the users listening.
 * @param uuid User's uuid
 * @param payload Message to be published
 */
function publishMessage(uuid, payload) {
    var e_5, _a;
    if (!exports.messages[payload.roomId])
        return;
    // Create message
    var message = {
        uuid: lodash_1.uniqueId(),
        userId: uuid,
        contents: payload.message,
        timestamp: Date.now()
    };
    // Save it to the message db
    exports.messages[payload.roomId].push(message);
    // Update the room activity timer.
    exports.rooms[payload.roomId].lastActive = message.timestamp;
    try {
        // publish it to users in the channel
        for (var _b = __values(exports.rooms[payload.roomId].users), _c = _b.next(); !_c.done; _c = _b.next()) {
            var userId = _c.value;
            var socket = users_1.getSocketByUUID(userId);
            if (!socket)
                continue;
            WebSocketController_1.default.emitRoomMessage(socket, payload.roomId, message);
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_5) throw e_5.error; }
    }
}
exports.publishMessage = publishMessage;
/**
 * Sets the user's webcam/mic stream state for the room they're in.
 * @param room Room ID
 * @param user User's UUID, probably grabbed from the request or socket.
 * @param state Stream state
 */
function setUserStreamState(room, user, tracks) {
    if (!exports.rooms[room]) {
        return;
    }
    exports.rooms[room].streamState[user] = tracks;
    publishIndexUpdate();
    publishRoomUpdate(room);
}
exports.setUserStreamState = setUserStreamState;
function setUserStreams(room, user, tracks) {
    if (!exports.rooms[room]) {
        return;
    }
    exports.rooms[room].streams[user] = tracks;
    publishIndexUpdate();
    publishRoomUpdate(room);
}
exports.setUserStreams = setUserStreams;
