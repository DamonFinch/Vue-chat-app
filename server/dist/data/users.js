"use strict";
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
exports.updateAvatar = exports.rerollUsername = exports.destroyUser = exports.createUser = exports.getSocketByUUID = exports.getUserByUUID = exports.getUUIDBySocket = exports.sockets = void 0;
var lodash_1 = require("lodash");
var trash_username_generator_1 = __importDefault(require("trash-username-generator"));
var WebSocketController_1 = __importDefault(require("../controllers/ws/WebSocketController"));
var fs_1 = require("fs");
// const users = new Map<String, User>();
var users = {};
exports.sockets = {};
/**
 * Publish the entire user index to all users. Kinda wasteful, butttt fuckkkittt
 */
function publishUserIndex() {
    var e_1, _a;
    try {
        for (var _b = __values(Object.entries(exports.sockets)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), key = _d[0], socket = _d[1];
            WebSocketController_1.default.emitUserList(socket, users);
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
function getUUIDBySocket(socket) {
    var e_2, _a;
    try {
        for (var _b = __values(Object.entries(exports.sockets)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), uuid = _d[0], s = _d[1];
            if (s === socket)
                return uuid;
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return "";
}
exports.getUUIDBySocket = getUUIDBySocket;
function getUserByUUID(uuid) {
    if (users[uuid])
        return users[uuid];
    return undefined;
}
exports.getUserByUUID = getUserByUUID;
function getSocketByUUID(uuid) {
    if (exports.sockets[uuid])
        return exports.sockets[uuid];
    return undefined;
}
exports.getSocketByUUID = getSocketByUUID;
/**
 * Creates a new user, updates everyone that someone has connected, and returns the new user's data.
 * @param {ws} socket Websocket
 * @return {string, string, string} User's uuid, username, and avatar
 */
function createUser(socket) {
    var uuid = lodash_1.uniqueId();
    var username = trash_username_generator_1.default();
    var avatarList = fs_1.readdirSync("public/assets/avatars");
    var avatar = "http://localhost:4000/assets/avatars/" + avatarList[Math.floor(Math.random() * avatarList.length)];
    users[uuid] = {
        username: username,
        dead: false,
        avatar: avatar
    };
    exports.sockets[uuid] = socket;
    // Everyone should be interested in a new user being created, so we'll just update the user list
    publishUserIndex();
    return { uuid: uuid, username: username, avatar: avatar };
}
exports.createUser = createUser;
/**
 * Deletes the user from the user list and publishes the new user list.
 * @param {string} uuid User's uuid
 */
function destroyUser(uuid) {
    // delete users[uuid];
    users[uuid].dead = true;
    delete exports.sockets[uuid];
    publishUserIndex();
}
exports.destroyUser = destroyUser;
function rerollUsername(uuid) {
    var username = trash_username_generator_1.default();
    users[uuid].username = username;
    var sock = getSocketByUUID(uuid);
    publishUserIndex();
    WebSocketController_1.default.emitCredentials(sock, {
        username: username,
        avatar: users[uuid].avatar,
        dead: users[uuid].dead
    });
    return username;
}
exports.rerollUsername = rerollUsername;
function updateAvatar(uuid, avatar) {
    users[uuid].avatar = avatar;
    var sock = getSocketByUUID(uuid);
    publishUserIndex();
    WebSocketController_1.default.emitCredentials(sock, users[uuid]);
}
exports.updateAvatar = updateAvatar;
exports.default = users;
