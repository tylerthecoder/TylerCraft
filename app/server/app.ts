import { Request, Response, Application } from "express";
import { WorldManager } from "./worldManager";
import SocketServer from "./socket";
import * as wSocket from "ws";
import { Db, MongoClient } from "mongodb";

let worldManager: WorldManager;
export let SocketInterface: SocketServer;
export let db: Db;

const addRoutes = (app: Application) => {
  app.get("/worlds", async (req: Request, res: Response) => {
    const worlds = await worldManager.getAllWorlds();
    res.send(worlds);
  });
}

const setupSocketServer = (wss: wSocket.Server) => {
  SocketInterface = new SocketServer(wss);
}

const main = async (client: MongoClient) => {
  db = client.db("games");

  console.log("Database Connected");
  worldManager = new WorldManager();
}

const TylerCraftApp = {
  main,
  setupSocketServer,
  addRoutes,
}

export default TylerCraftApp;

