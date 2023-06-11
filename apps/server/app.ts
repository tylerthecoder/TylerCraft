import { Request, Response, Application } from "express";
import { GameManager } from "./worldManager.js";
import SocketServer from "./socket.js";
import WebSocket from "ws";
import { Db, MongoClient } from "mongodb";

let worldManager: GameManager;
export let db: Db;

const addRoutes = (app: Application) => {
  app.get("/worlds", async (req: Request, res: Response) => {
    const worlds = await worldManager.getAllWorlds();
    res.send(worlds);
  });
}

export let SocketInterface: SocketServer;

const main = async (client: MongoClient, wss: WebSocket.WebSocketServer) => {
  db = client.db("games");
  console.log("Database Connected");
  SocketInterface = new SocketServer(wss);
  worldManager = new GameManager();
}

const TylerCraftApp = {
  main,
  addRoutes,
}

export default TylerCraftApp;
