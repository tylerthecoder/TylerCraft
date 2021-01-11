import { Request, Response, Application } from "express";
import { WorldManager } from "./worldManager";
import SocketServer from "./socket";
import * as wSocket from "ws";
import { Db, MongoClient } from "mongodb";

let worldManager: WorldManager;
export let db: Db;

const addRoutes = (app: Application) => {
  app.get("/worlds", async (req: Request, res: Response) => {
    const worlds = await worldManager.getAllWorlds();
    res.send(worlds);
  });
}

const main = async (client: MongoClient, wss: wSocket.Server) => {
  db = client.db("games");

  console.log("Database Connected");
  const SocketInterface = new SocketServer(wss);
  worldManager = new WorldManager(SocketInterface);
}

const TylerCraftApp = {
  main,
  addRoutes,
}

export default TylerCraftApp;

