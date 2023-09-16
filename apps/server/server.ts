import express from "express";
import { Request, Response } from "express";
import { WebSocketServer } from "ws";
import cors from "cors";
import { TerrainGenModule, WorldModule } from "@craft/engine";
import SocketServer from "./socket.js";
import { DBManager } from "./db.js";
import { GameService, IGameService } from "./game-service.js";

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

const start = async (gameService: IGameService) => {
  const server = app.listen(PORT, () =>
    console.log(`Server running on port ${PORT}`)
  );
  const wss = new WebSocketServer({ server });

  console.log("Loading wasm modules");
  await WorldModule.load();
  await TerrainGenModule.load();
  console.log("Wasm modules loaded");

  SocketInterface = new SocketServer(wss);

  app.get("/worlds", async (_req: Request, res: Response) => {
    const worlds = await gameService.getAllWorlds();
    res.send(worlds);
  });
};

const startApp = async () => {
  const db = await DBManager.makeClient();
  console.log("Database Connected");
  const gameService = new GameService(db);
  await start(gameService);
};

startApp()
  .then(() => console.log("Server started"))
  .catch((err) => console.error(err));
