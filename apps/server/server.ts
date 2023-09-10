import express from "express";
import { Request, Response } from "express";
import { WebSocketServer } from "ws";
import cors from "cors";
import { WorldModule } from "@craft/engine";
import { DBManager } from "./db.js";
import { GameManager } from "./worldManager.js";
import SocketServer from "./socket.js";

export const PORT = process.env.PORT ?? 3000;

export const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "50mb" }));

const webClientPath = new URL("../../web-client/dist", import.meta.url)
  .pathname;
console.log("Serving web client, path: ", webClientPath);
app.use(express.static(webClientPath));

export let SocketInterface: SocketServer;

const start = async () => {
  const server = app.listen(PORT, () =>
    console.log(`Server running on port ${PORT}`)
  );
  const wss = new WebSocketServer({ server });

  console.log("Loading world module");
  await WorldModule.load();
  console.log("World module loaded");

  const db = await DBManager.makeClient();
  console.log("Database Connected");

  SocketInterface = new SocketServer(wss);

  const worldManager = new GameManager(db);

  app.get("/worlds", async (_req: Request, res: Response) => {
    const worlds = await worldManager.getAllWorlds();
    res.send(worlds);
  });
};

start()
  .then(() => console.log("Server started"))
  .catch((err) => console.error(err));
