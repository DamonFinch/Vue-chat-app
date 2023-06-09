import { uniqueId } from "lodash";
import type {Subscriber} from "./subscribers";
import lodash from "lodash";
import WebSocketController from "../controllers/ws/WebSocketController";
import type {MessagePayload} from "../controllers/ws/WebSocketController";
import users, { getSocketByUUID } from "./users";
import ws from "ws";

export type RoomStreamTracks = {
    [key: string]: {
        userMedia: string,
        screenshare: string,
    }
}

export type RoomStreamState = {
    [key: string]: {
        webcam: boolean,
        microphone: boolean,
        screenshare: boolean
    }
}

export type RoomEntry = {
    name: String,
    video: Boolean,
    audio: Boolean,
    screenshare: Boolean,
    locked: Boolean,
    users: Array<String>,
    lastActive: number,
    streams: RoomStreamTracks,
    streamState: RoomStreamState
}

export type Message = {
    uuid: String
    userId: String,
    contents: String,
    timestamp: number,
}

export const rooms: {[key: string]: RoomEntry} = {};
export const messages: {[key: string]: Array<Message>} = {};

// Split passwords from the rooms object so updating the users of room changes is simple.
export const passwords: {[key: string]: string} = {};

const subscriptions = {
    index: new Array<Subscriber>(),
    rooms: new Map<String, Array<Subscriber>>()
}

/**
 * Publishes the update of the room index to subscribers.
 */
function publishIndexUpdate() {
    subscriptions.index.forEach((subscriber) => {
        WebSocketController.emitRoomIndex(subscriber.socket, rooms);
    })
}

function publishRoomUpdate(roomId: string) {
    subscriptions.rooms.get(roomId)?.forEach((subscriber) => {
        WebSocketController.emitRoomInfo(subscriber.socket, {
            id: roomId,
            room: rooms[roomId]
        })
    });
}

/**
 * Publishes a leave room event to all users in the room so that they can clean up their connections with that user.
 * @param roomId Room ID
 * @param uuid User that left the room
 */
function publishLeaveRoom(roomId: string, uuid: string, userStreams: {userMedia: string, screenshare: string}) {
    subscriptions.rooms.get(roomId)?.forEach((subscriber) => {
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
        }))
    }) 
}

/**
 * Subscribe to the events of the room index or a specific room.
 * @param {string} key What type of subscription is it? [index, room]
 * @param {Subscriber} subscriber Subscriber data
 * @param {string} subkey Room key if we're subscribing to a room
 */
export function subscribe(key: string, subscriber: Subscriber, subkey: string = "") {
    // TODO - Check if the subscriber already exists.
    if (key === "index") {
        subscriptions.index.push(subscriber);
    }
    else if (key === "room" && subkey) {
        if (subscriptions.rooms.has(subkey)) {
            subscriptions.rooms.get(subkey)?.push(subscriber)
        }
    }
}

/**
 * Unsubscribe from the events of the room index or a specific room.
 * @param {string} key What type of subscription is it? [index, room]
 * @param {Subscriber} subscriber Subscriber data
 * @param {string} subkey Room key if we're subscribing to a room
 */
export function unsubscribe(key: string, subscriber: Subscriber, subkey: string = "") {
    // TODO Make this less shit
    if (key === "index") {
        lodash.remove(subscriptions.index, (sub) => {
            if (sub.uuid === subscriber.uuid)
                return true;
            return false;
        });
    }

    else if (key === "room" && subkey) {
        lodash.remove(subscriptions.rooms.get(subkey) as Array<Subscriber>, (sub) => {
            return sub.uuid === subscriber.uuid;
        });
    }
}

/**
 * Unsubscribes a user from all room related subscriptions.
 * @param {Subscriber} subscriber Subscriber info
 */
export function unsubscribeAll(subscriber: Subscriber) {
    lodash.remove(subscriptions.index, (sub) => {
        if (sub.uuid === subscriber.uuid)
            return true;
        return false;
    });
    for (const [key, val] of subscriptions.rooms.entries()) { 
        lodash.remove(val, (sub) => {
            return sub.uuid === subscriber.uuid;
        })
    }
}

/**
 *  Creates a new chatroom and notifies subscribers of the room index that a new room is available. 
 * @param {RoomEntry} entry The RoomEntry containing the data of our room settings.
 * @param {string} password An optional room password.
 * @return {}
 */
export function createRoom(entry: RoomEntry, password: string) {
    // Create a new room with a unique ID, so we don't have any conflicts in room addresses
    const id = uniqueId();
    rooms[id] = entry;

    // Track the password if it exist
    if (password)
        passwords[id] = password;

    // Create the subscription object for this room so users can track it.
    subscriptions.rooms.set(id, []);
    
    // Now we need to update the subscribers.
    publishIndexUpdate();

    // Create the room's message store
    messages[id] = [];

    // Create callback that destroys the room after 5 minutes of nobody being in the room
    const roomCheck = setInterval(() => {
        if (rooms[id].users.length !== 0)
            return;
        
        // If 5 minutes have elapsed since any messages have been sent and nobody is in the room, we remove
        if (Date.now() - rooms[id].lastActive > 5 * 1000 * 60) {
            removeRoom(id);
            clearInterval(roomCheck);
        }
            
    }, 5 * 1000 * 60);

    // Return the room & room id 
    return {...rooms[id],id};
}


/**
 * Removes an inactive room, cleans up subscribers, and notifies users of the room index updating.
 * @param {string} roomId Room ID
 */
export function removeRoom(roomId: string) {
    if (rooms[roomId]) {
        // We should just be able to delete it since we only really delete when there's no users in it after some time period
        delete rooms[roomId];
        delete messages[roomId];
        // Clean up the subscribers of this channel
        subscriptions.rooms.delete(roomId);
        // Notify the peeps
        publishIndexUpdate();
    }
}

/**
 * Joins and subscribes a user to a specific room, then initiates webrtc contact with the other users.
 * @param {string} roomId Room ID
 * @param {Subscriber} subscriber Subscriber info
 */
export function joinRoom(roomId: string, subscriber: Subscriber) {
    // Let's first check if the user is in a room or has any room subscriptions, and leave them. 
    for (const [key, room] of Object.entries(rooms)) {
        if (room.users.includes(subscriber.uuid)) {
            // Then we need to unsub and remove from the room
            if (roomId !== key)
                leaveRoom(key, subscriber);
        }
    }
    subscriptions.rooms.get(roomId)?.push(subscriber);
    publishIndexUpdate();
    publishRoomUpdate(roomId);
    // We also need to send the user all the previous chat messages.
    WebSocketController.emitRoomHistory(subscriber.socket, roomId, messages[roomId]);
    // Lastly we need to connect this user to the existing users.
    for (const user of rooms[roomId].users) {
        if (subscriber.uuid === user)
            continue;
        // For every user already in the room
        // Get their socket and tell them to initiate contact with the new subscriber
        const sock = getSocketByUUID(user as string);
        sock?.send(JSON.stringify({
            event: "rtc/init",
            payload: {
                target: subscriber.uuid,
            }
        }))
    }
}

/**
 * Leaves and unsubscribes a user from a room.
 * @param {string} roomId Room ID
 * @param {Subscriber} subscriber Subscriber info
 */
export function leaveRoom(roomId: string, subscriber: Subscriber) {
    unsubscribe("room", subscriber, roomId);
    let userStreams = rooms[roomId].streams[subscriber.uuid as string];
    if (!userStreams) {
        userStreams = { userMedia: "", screenshare: ""};
    }
    lodash.remove(rooms[roomId].users, (user) => user === subscriber.uuid);
    delete rooms[roomId].streams[subscriber.uuid as string];
    publishIndexUpdate();
    publishRoomUpdate(roomId);
    publishLeaveRoom(roomId, subscriber.uuid as string, userStreams);
}


/**
 * Leaves and unsubscribes a user from all rooms
 * @param {Subscriber} subscriber Subscriber info
 */
export function leaveAll(subscriber: Subscriber) {
    for (const [key, val] of Object.entries(rooms)) { 
        delete val.streams[subscriber.uuid as string];
        lodash.remove(val.users, (sub) => {
            if (sub === subscriber.uuid) {
                publishIndexUpdate();
                publishRoomUpdate(key);
            }
            return sub === subscriber.uuid;
        })
    }
}

/**
 * Deletes a room message.
 * @param uuid Message uuid
 * @param userId User's uuid
 */
export function destroyMessage(uuid: string, userId: string) {

}

/**
 * Publishes a room message to all the users listening.
 * @param uuid User's uuid
 * @param payload Message to be published
 */
export function publishMessage(uuid: string, payload: MessagePayload) {
    if (!messages[payload.roomId])
        return
    // Create message
    const message: Message = {
        uuid: uniqueId(),
        userId: uuid,
        contents: payload.message,
        timestamp: Date.now()
    }

    // Save it to the message db
    messages[payload.roomId].push(message);

    // Update the room activity timer.
    rooms[payload.roomId].lastActive = message.timestamp;

    // publish it to users in the channel
    for (const userId of rooms[payload.roomId].users) {
        const socket = getSocketByUUID(userId as string);
        if (!socket)
            continue;
        WebSocketController.emitRoomMessage(socket as ws, payload.roomId, message);
    }
}

/**
 * Sets the user's webcam/mic stream state for the room they're in.
 * @param room Room ID
 * @param user User's UUID, probably grabbed from the request or socket.
 * @param state Stream state
 */
export function setUserStreamState(room: string, user: string, tracks: {webcam: boolean, microphone: boolean, screenshare: boolean}) {
    if (!rooms[room]) {
        return;
    }
    rooms[room].streamState[user] = tracks;
    publishIndexUpdate();
    publishRoomUpdate(room);
}

export function setUserStreams(room: string, user: string, tracks: {userMedia: string, screenshare: string}) {
    if (!rooms[room]) {
        return;
    }
    rooms[room].streams[user] = tracks;
    publishIndexUpdate();
    publishRoomUpdate(room);
}