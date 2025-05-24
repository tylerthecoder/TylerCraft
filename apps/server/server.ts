import express from "express";
import { Request, Response } from "express";
import { WebSocketServer } from "ws";
import cors from "cors";
import SocketServer from "./socket.js";
import { ServerGameManager } from "./server-game-manager.js";
import { GameDb } from "./db.js";
import { IGameMetadata } from "@craft/engine";

const PORT = process.env.PORT ?? 3000;
const webClientPath = new URL("../../web-client/dist", import.meta.url)
  .pathname;

console.log("Config", { PORT, webClientPath });

const app = express();
const games: Map<string, ServerGameManager> = new Map();
const gameDb = await GameDb.makeClient();

const server = app.listen(PORT, () =>
  console.log(`Server running on port ${PORT} 🚀`)
);

const wss = new WebSocketServer({ server });
const socketService = new SocketServer(wss);

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "50mb" }));

app.use(express.static(webClientPath));

app.get("/games", async (_req: Request, res: Response) => {
  const gamesMetadata = await gameDb.getAllGameMetadata();

  const gameInfos: (IGameMetadata & {
    isRunning: boolean;
    onlinePlayers: number;
  })[] = gamesMetadata.map((gameMetadata) => {
    const game = games.get(gameMetadata.gameId);
    return {
      ...gameMetadata,
      isRunning: game ? game.is_running : false,
      onlinePlayers: game ? game.getOnlinePlayers() : 0,
    };
  });

  res.send(gameInfos);
});

app.post("/game", async (req: Request, res: Response) => {
  const game = await gameDb.createGame();
  res.send(game.id);
});

app.post("/game/:id/start", async (req: Request, res: Response) => {
  const { id } = req.params;
  const localGame = games.get(id);
  if (localGame && localGame.is_running) {
    res.status(404).send("Game already running");
    return;
  }
  const game = await gameDb.getGame(id);
  if (!game) {
    res.status(404).send("Game not found");
    return;
  }
  const gameManager = new ServerGameManager(game, socketService, gameDb);
  games.set(id, gameManager);
  gameManager.start();
  res.send("Game started");
});

app.get("/game/:id/chunk/:x/:y", async (req: Request, res: Response) => {
  const { id, x, y } = req.params;
  const game = games.get(id);
  if (!game) {
    res.status(404).send("Game not found");
    return;
  }
  const chunkPos = { x: parseInt(x), y: parseInt(y) };
  const chunk = game.getChunk(chunkPos);
  res.send(chunk);
});

console.log("Server started");
