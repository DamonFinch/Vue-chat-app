"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var auth_1 = __importDefault(require("../middleware/auth"));
var UserController_1 = __importDefault(require("../controllers/http/UserController"));
var router = (0, express_1.Router)();
router.get("/avatar/index", UserController_1.default.avatarIndex);
router.use(auth_1.default);
router.post("/username/reroll", UserController_1.default.rerollUsername);
router.patch("/avatar", UserController_1.default.updateAvatar);
exports.default = router;
