"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var websocket_1 = __importDefault(require("./websocket"));
var rooms_1 = __importDefault(require("./routes/rooms"));
var users_1 = __importDefault(require("./routes/users"));
var cors_1 = __importDefault(require("cors"));
var app = express_1.default();
var port = process.env.PORT || 4000;
app.use(cors_1.default());
app.use(express_1.default.json());
app.use(express_1.default.static("public"));
app.use("/room", rooms_1.default);
app.use("/user", users_1.default);
var server = app.listen(port, function () {
    console.log("PepeChat listening at http://localhost:" + port);
});
server.on('upgrade', function (req, socket, head) {
    websocket_1.default.handleUpgrade(req, socket, head, function (socket) {
        websocket_1.default.emit('connection', socket, req);
    });
});
