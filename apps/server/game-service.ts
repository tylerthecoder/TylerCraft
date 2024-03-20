import {
  Chunk,
  IChunkReader,
  ICreateGameOptions,
  IGameData,
  IGameMetadata,
  ISerializedGame,
  ISocketMessageType,
  SocketMessage,
  TerrainGenerator,
  Vector2D,
  WorldModule,
} from "@craft/engine";
import { ServerGame } from "./server-game.js";
import Websocket, { WebSocketServer } from "ws";
import { IDbManager } from "./db.js";
import SocketServer from "./socket.js";

export class RamChunkReader implements IChunkReader {
  private chunkMap = new Map<string, Chunk>();
  private terrainGenerator: TerrainGenerator;

  constructor(serializedGame?: ISerializedGame) {
    this.terrainGenerator = new TerrainGenerator(
      (chunkPos) => this.chunkMap.has(chunkPos.toIndex()),
      (chunkPos) => this.chunkMap.get(chunkPos.toIndex())
    );
    if (!serializedGame) return;
    for (const chunkData of serializedGame.world.chunks) {
      const chunk = WorldModule.createChunkFromSerialized(chunkData);
      this.chunkMap.set(chunk.uid, chunk);
    }
  }

  async getChunk(chunkPos: string) {
    let chunk = this.chunkMap.get(chunkPos);
    if (!chunk) {
      chunk = this.terrainGenerator.generateChunk(Vector2D.fromIndex(chunkPos));
    }
    return chunk;
  }
}

export interface IGameService {
  getWorld(gameId: string): Promise<ServerGame | null>;
  getAllWorlds(): Promise<IGameMetadata[]>;
  createGame(options: ICreateGameOptions): Promise<ServerGame>;
}

export class GameService implements IGameService {
  private games: Map<string, ServerGame> = new Map();

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

  async handleSocketMessage(message: SocketMessage, ws: Websocket) {
    if (message.isType(ISocketMessageType.joinWorld)) {
      const { worldId, myUid } = message.data;
      console.log("Got join world message", worldId, myUid);

      const world = await this.getWorld(worldId);
      if (!world) {
        console.log("That world doesn't exist", worldId);

        this.socketInterface.send(
          ws,
          new SocketMessage(ISocketMessageType.worldNotFound, {})
        );

        return;
      }
      // this function sends a welcome message to the client
      world.addSocket(myUid, ws);
    } else if (message.isType(ISocketMessageType.newWorld)) {
      const payload = message.data;
      const world = await this.createGame(payload);
      console.log("Create Id: ", world.gameId);
      world.addSocket(payload.myUid, ws);
    } else if (message.isType(ISocketMessageType.saveWorld)) {
      const payload = message.data;
      const world = this.games.get(payload.worldId);
      if (!world) {
        console.log("That world doesn't exist", payload);
        return;
      }
      await this.dbManager.saveGame(world.serialize());
    }
  }

  async getWorld(gameId: string): Promise<ServerGame | null> {
    const world = this.games.get(gameId);
    if (world) {
      return world;
    }

    const dbGame = await this.dbManager.getGame(gameId);
    if (!dbGame) {
      return null;
    }

    const gameData: IGameData = {
      id: gameId,
      name: dbGame.name,
      gameSaver: {
        save: async (game: ServerGame) => {
          await this.dbManager.saveGame(game.serialize());
        },
      },
      chunkReader: new RamChunkReader(),
      data: dbGame,
      config: dbGame.config,
      multiplayer: true,
      activePlayers: [],
    };

    // add the world to our local list
    const serverWorld = await ServerGame.make(gameData, this.socketInterface);

    this.games.set(gameId, serverWorld);
    return serverWorld;
  }

  async getAllWorlds() {
    return this.dbManager.getAllGameMetadata();
  }

  async createGame(options: ICreateGameOptions): Promise<ServerGame> {
    console.log("Create world options", options);

    const id = String(Math.random());

    const gameData: IGameData = {
      id,
      name: options.name,
      gameSaver: {
        save: async (game: ServerGame) => {
          await this.dbManager.saveGame(game.serialize());
        },
      },
      chunkReader: new RamChunkReader(),
      config: options.config,
      multiplayer: true,
      activePlayers: [],
    };

    const newWorld = await ServerGame.make(gameData, this.socketInterface);

    await newWorld.baseLoad();

    this.games.set(id, newWorld);

    return newWorld;
  }
}
