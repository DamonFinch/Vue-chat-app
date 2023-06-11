"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var auth_1 = __importDefault(require("../middleware/auth"));
var RoomController_1 = __importDefault(require("../controllers/http/RoomController"));
var router = express_1.Router();
router.use(auth_1.default);
router.post("/create", RoomController_1.default.create);
router.post("/:id/join", RoomController_1.default.join);
router.post("/:id/leave", RoomController_1.default.leave);
exports.default = router;
