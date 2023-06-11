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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var rooms_1 = require("../../data/rooms");
var subscribers_1 = require("../../data/subscribers");
var argon2_1 = __importDefault(require("argon2"));
var RoomController = {
    create: function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, name, video, audio, screenshare, password, locked, entry, encrypted_password, room;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = req.body, name = _a.name, video = _a.video, audio = _a.audio, screenshare = _a.screenshare, password = _a.password;
                        locked = req.body.private;
                        entry = {
                            name: name,
                            video: video,
                            audio: audio,
                            screenshare: screenshare,
                            locked: locked,
                            lastActive: Date.now(),
                            users: [],
                            streams: {},
                            streamState: {}
                        };
                        return [4 /*yield*/, argon2_1.default.hash(password)];
                    case 1:
                        encrypted_password = _b.sent();
                        room = (0, rooms_1.createRoom)(entry, encrypted_password);
                        // Send the user back the new successful room
                        res.send(room);
                        return [2 /*return*/];
                }
            });
        });
    },
    join: function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var id, password, uuid, valid_password;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        id = req.params.id;
                        password = req.body.password;
                        uuid = req.uuid;
                        // check if room exists
                        if (!rooms_1.rooms.hasOwnProperty(id)) {
                            res.sendStatus(404);
                            return [2 /*return*/];
                        }
                        // Since we also attempt joining when the user enters the page, let's check if they're already in the room
                        if (rooms_1.rooms[id].users.includes(uuid)) {
                            // If they're in it, let's just remind them and not do anything data alterations.
                            res.sendStatus(200);
                            return [2 /*return*/];
                        }
                        if (!rooms_1.passwords.hasOwnProperty(id)) return [3 /*break*/, 2];
                        return [4 /*yield*/, argon2_1.default.verify(rooms_1.passwords[id], password)];
                    case 1:
                        valid_password = _a.sent();
                        if (!valid_password) {
                            res.sendStatus(403);
                            return [2 /*return*/];
                        }
                        _a.label = 2;
                    case 2:
                        // If we make it this far, we need to
                        // 1. Add our user to the users in the chatroom
                        rooms_1.rooms[id].users.push(uuid);
                        // 3. Send the status back that we've joined successfully
                        (0, rooms_1.joinRoom)(id, (0, subscribers_1.getSubscriber)(uuid));
                        res.sendStatus(200);
                        return [2 /*return*/];
                }
            });
        });
    },
    leave: function (req, res, next) {
        var id = req.params.id;
        // Strip the user's uuid from the request that we attached it to from the auth middleware.
        var uuid = req.uuid;
        // check if room exists
        if (!rooms_1.rooms.hasOwnProperty(id)) {
            // If the room exists, just tell them it succeeded since they can't be in it anyways.
            res.sendStatus(200);
            return;
        }
        // Remove the user and tell them it worked out.
        (0, rooms_1.leaveRoom)(id, (0, subscribers_1.getSubscriber)(uuid));
        res.sendStatus(200);
    }
};
exports.default = RoomController;
