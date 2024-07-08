import {
  Game,
  ICreateGameOptions,
  ISerializedGame,
  ISocketMessageType,
  SandboxGScript,
  SocketMessage,
  setConfig,
} from "@craft/engine";
import { ServerGameScript } from "./server-game.js";
import Websocket from "ws";
import { IDbManager } from "./db.js";
import SocketServer from "./socket.js";

export class TimerRunner {
  private lastTime = Date.now();

  constructor(private game: Game) {
    setInterval(this.update.bind(this), 1000 / 40);
  }

  update() {
    const now = Date.now();
    const diff = now - this.lastTime;
    // if we leave the tab for a long time delta gets very big, and the play falls out of the world.
    // I'm just going to make them not move for now, but I need to remove make the system more tollerant of large deltas
    if (diff > 100) {
      console.log("Skipping update, time diff is too large", diff);
      this.lastTime = now;
      return;
    }
    this.game.update(diff);
    this.lastTime = now;
  }
}

export class GameService {
  private games: Map<string, Game> = new Map();

  constructor(
    private dbManager: IDbManager,
    private socketInterface: SocketServer
  ) {
    this.socketInterface.listenForConnection((ws: Websocket) => {
      this.socketInterface.listenTo(ws, (message) => {
        this.handleSocketMessage(message, ws)
          .then(() => void 0)
          .catch((e) => {
            console.log("Error handling socket message", message, e);
          });
      });
    });
  }

  private async buildGame(
    id: string,
    options: ICreateGameOptions | ISerializedGame
  ): Promise<Game> {
    const gameSaver = {
      save: async (game: Game) => {
        await this.dbManager.saveGame(game.serialize());
      },
    };

    const game = Game.make(options, gameSaver);

    game.addGameScript(ServerGameScript, this.socketInterface);

    game.addGameScript(SandboxGScript);

    await game.setupScripts();

    console.log("Starting game", id, game.stateDiff.get());

    new TimerRunner(game);

    this.games.set(id, game);

    return game;
  }

  async handleSocketMessage(message: SocketMessage, ws: Websocket) {
    if (message.isType(ISocketMessageType.joinWorld)) {
      const { worldId, myUid } = message.data;
      console.log("Got join world message", worldId, myUid);

      const game = await this.getWorld(worldId);
      if (!game) {
        console.log("That world doesn't exist", worldId);

        this.socketInterface.send(
          ws,
          new SocketMessage(ISocketMessageType.worldNotFound, {})
        );

        return;
      }

      const serverGameScript = game.getGameScript(ServerGameScript);

      // this function sends a welcome message to the client
      serverGameScript.addSocket(myUid, ws);
    } else if (message.isType(ISocketMessageType.newWorld)) {
      const payload = message.data;
      const game = await this.createGame(payload);
      const serverGameScript = game.getGameScript(ServerGameScript);
      console.log("Create Id: ", game.gameId);
      serverGameScript.addSocket(payload.myUid, ws);
    } else if (message.isType(ISocketMessageType.saveWorld)) {
      const payload = message.data;
      const game = this.games.get(payload.worldId);
      if (!game) {
        console.log("That world doesn't exist", payload);
        return;
      }
      await this.dbManager.saveGame(game.serialize());
    }
  }

  async getWorld(gameId: string): Promise<Game | null> {
    console.log("Getting game", gameId);

    const foundGame = this.games.get(gameId);
    if (foundGame) {
      console.log("Found game in memory");
      return foundGame;
    }

    const dbGame = await this.dbManager.getGame(gameId);
    if (!dbGame) {
      console.log("Game not found");
      return null;
    }

    return this.buildGame(gameId, dbGame);
  }

  async getAllWorlds() {
    return this.dbManager.getAllGameMetadata();
  }

  async createGame(options: ICreateGameOptions): Promise<Game> {
    console.log("Creating game with options", options);

    setConfig(options.config);

    const id = String(Math.random());

    return this.buildGame(id, options);
  }
}
