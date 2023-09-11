import {
  Chunk,
  IChunkReader,
  ICreateGameOptions,
  IGameData,
  IGameMetadata,
  ISerializedGame,
  TerrainGenerator,
  Vector2D,
  WorldModule,
} from "@craft/engine";
import { ServerGame } from "./server-game.js";
import { IDbManager } from "./db.js";

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

  constructor(private dbManager: IDbManager) {}

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
    const serverWorld = await ServerGame.make(gameData);

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

    const newWorld = await ServerGame.make(gameData);

    await newWorld.baseLoad();

    this.games.set(id, newWorld);

    return newWorld;
  }
}
