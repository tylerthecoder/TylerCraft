import {
  Chunk,
  EntityController,
  EntityHolder,
  Game,
  IChunkReader,
  ICreateGameOptions,
  ISerializedGame,
  ISocketMessageType,
  SocketMessage,
  TerrainGenerator,
  Vector2D,
  World,
  WorldModule,
  setConfig,
} from "@craft/engine";
import { ServerGame } from "./server-game.js";
import Websocket from "ws";
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

export class GameService {
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
      console.log("Create Id: ", world.game.gameId);
      world.addSocket(payload.myUid, ws);
    } else if (message.isType(ISocketMessageType.saveWorld)) {
      const payload = message.data;
      const world = this.games.get(payload.worldId);
      if (!world) {
        console.log("That world doesn't exist", payload);
        return;
      }
      await this.dbManager.saveGame(world.game.serialize());
    }
  }

  async getWorld(gameId: string): Promise<ServerGame | null> {
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

    const chunkReader = new RamChunkReader(dbGame);
    const gameSaver = {
      save: async (game: Game) => {
        await this.dbManager.saveGame(game.serialize());
      },
    };

    const game = await Game.make(dbGame, chunkReader, gameSaver);

    const serverGame = new ServerGame(
      dbGame.config,
      this.socketInterface,
      game
    );

    console.log("Created new game in memory");

    // add the world to our local list
    this.games.set(gameId, serverGame);

    return serverGame;
  }

  async getAllWorlds() {
    return this.dbManager.getAllGameMetadata();
  }

  async createGame(options: ICreateGameOptions): Promise<ServerGame> {
    console.log("Creating game with options", options);

    setConfig(options.config);

    const id = String(Math.random());

    const gameSaver = {
      save: async (game: Game) => {
        await this.dbManager.saveGame(game.serialize());
      },
    };
    const chunkReader = new RamChunkReader();

    const world = await World.make(chunkReader);
    const entities = new EntityHolder();
    const entityControllers = new Map<string, EntityController[]>();

    const game = new Game(
      id,
      options.name,
      options.config,
      entities,
      entityControllers,
      world,
      gameSaver
    );

    const serverUsecase = new ServerGame(
      options.config,
      this.socketInterface,
      game
    );

    this.games.set(id, serverUsecase);

    return serverUsecase;
  }
}
