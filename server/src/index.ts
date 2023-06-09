import express, { Request } from 'express';
import wsServer from './websocket';
import roomRouter from "./routes/rooms";
import userRouter from "./routes/users";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/room", roomRouter);
app.use("/user", userRouter);

const server = app.listen(port, () => {
    console.log(`VueChat listening at http://localhost:${port}`);
})


server.on('upgrade', (req: any, socket: any, head: any) => {
    wsServer.handleUpgrade(req, socket, head, socket => {
        wsServer.emit('connection', socket, req);
    })
})