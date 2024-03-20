import express from "express";
import { Request, Response } from "express";
import { WebSocketServer } from "ws";
import cors from "cors";
import { TerrainGenModule, WorldModule } from "@craft/engine";
import SocketServer from "./socket.js";
import { GameService } from "./game-service.js";
import { FileDb } from "./file-db.js";

const PORT = process.env.PORT ?? 3000;

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "50mb" }));

const webClientPath = new URL("../../web-client/dist", import.meta.url)
  .pathname;
console.log("Serving web client, path: ", webClientPath);
app.use(express.static(webClientPath));

// const db = await DBManager.makeClient();
const fileDb = new FileDb();

const server = app.listen(PORT, () =>
  console.log(`Server running on port ${PORT} 🚀`)
);
const wss = new WebSocketServer({ server });

const socketService = new SocketServer(wss);

await WorldModule.load();
await TerrainGenModule.load();

const gameService = new GameService(fileDb, socketService);

app.get("/worlds", async (_req: Request, res: Response) => {
  const worlds = await gameService.getAllWorlds();
  res.send(worlds);
});

console.log("Server started");
