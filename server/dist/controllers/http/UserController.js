"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var users_1 = require("../../data/users");
var UserController = {
    avatarIndex: function (req, res) {
        var avatarList = fs_1.readdirSync("public/assets/avatars").map(function (val) {
            return "http://localhost:4000/assets/avatars/" + val;
        });
        res.send({
            avatars: avatarList
        });
    },
    updateAvatar: function (req, res) {
        var uuid = req.uuid;
        var url = req.body.url;
        if (!url) {
            res.sendStatus(404);
            return;
        }
        users_1.updateAvatar(uuid, url);
        res.sendStatus(200);
    },
    rerollUsername: function (req, res) {
        var uuid = req.uuid;
        var username = users_1.rerollUsername(uuid);
        res.status(200).send({ username: username });
    }
};
exports.default = UserController;
