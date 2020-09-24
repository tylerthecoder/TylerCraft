import {server} from "./server";
import * as db from "./db";
import SocketServer from "./socket";
import { WorldManager } from "./worldManager";

db.connect();

export const wss = new SocketServer(server);
export const worldManager = new WorldManager();





