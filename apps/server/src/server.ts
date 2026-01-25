import express from "express";
import { Request, Response } from "express";
import { WebSocketServer } from "ws";
import cors from "cors";
import SocketServer from "./socket.js";
import { ServerGameManager } from "./server-game-manager.js";
import { GameDb } from "./db.js";
import { IApiGameMetadata } from "@craft/engine";
import { CreateGameOptions } from "@craft/rust-world";
import { makeLogger } from "./logger.js";

const PORT = process.env.PORT ?? 3000;
const webClientPath = new URL("../../web-client/dist", import.meta.url)
  .pathname;

console.log("Config", { PORT, webClientPath });

const log = makeLogger("server.ts");

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

  const gameInfos: (IApiGameMetadata & {
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
  const body = req.body;
  log("Creating game", body);
  const options = CreateGameOptions.from_js(req.body);
  const game = await gameDb.createGame(options);
  log("Game created", game.id);
  res.send(game.id);
});

app.post("/game/:id/start", async (req: Request, res: Response) => {
  const { id } = req.params;
  log("Starting game", id);
  const localGame = games.get(id);
  if (localGame && localGame.is_running) {
    res.status(404).send("Game already running");
    return;
  }
  log("Getting game", id);
  const gameDto = await gameDb.getGame(id);
  if (!gameDto) {
    res.status(404).send("Game not found");
    return;
  }

  let game: ServerGameManager | null = null;
  try {
    game = await ServerGameManager.create(gameDto, socketService, gameDb);
  } catch (error) {
    log("Error creating  game", error);
    res.status(500).send("Error creating game");
    return;
  }

  games.set(id, game);
  game.start();
  res.send("Game started");
});

app.get("/game/:id/chunk/:x/:y", async (req: Request, res: Response) => {
  const { id, x, y } = req.params;
  const game = games.get(id);
  if (!game) {
    res.status(404).send("Game not found");
    return;
  }
  const xInt = parseInt(x);
  if (isNaN(xInt)) {
    res.status(400).send("Invalid x");
    return;
  }
  const yInt = parseInt(y);
  if (isNaN(yInt)) {
    res.status(400).send("Invalid y");
    return;
  }
  const chunk = game.getOrRequestChunk(xInt, yInt);
  if (!chunk) {
    res.status(404).send({ message: "Chunk requested" });
    return;
  }
  res.send(chunk);
});

console.log("Server started");
