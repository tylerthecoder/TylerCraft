import { Chunk, Game, IChunkReader, ICreateWorldOptions, IGameMetadata, ISerializedChunk, ISerializedGame, IWorldData, TerrainGenerator, Vector2D, World, WorldModel, WorldModule} from "@craft/engine";
import { db } from "./app.js";


export class RamChunkReader implements IChunkReader {
  private chunkMap = new Map<string, Chunk>();
  private terrainGenerator: TerrainGenerator;

  constructor(
    serializedGame?: ISerializedGame,
  ) {
    this.terrainGenerator = new TerrainGenerator(
      (chunkPos) => this.chunkMap.has(chunkPos.toIndex()),
      (chunkPos) => this.chunkMap.get(chunkPos.toIndex()),
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

export class DbWorldModel extends WorldModel {
  private gameCollection = db.collection("games");

  async createWorld(worldOptions: ICreateWorldOptions): Promise<IWorldData> {
    return {
      worldId: Math.random() + "",
      chunkReader: new RamChunkReader(),
      config: worldOptions.config,
      name: worldOptions.gameName,
      multiplayer: true,
    }
  }

  async getWorld(gameId: string): Promise<IWorldData | null> {
    const game = await this.gameCollection.findOne<ISerializedGame>({ gameId });

    if (!game) return null;

    return {
      data: game,
      chunkReader: new RamChunkReader(game),
      worldId: gameId,
      activePlayers: [],
      config: game.config,
      name: game.name
    }
  }

  async getAllWorlds() {
    // const games: IGameMetadata[] = [];
    const games: IGameMetadata[] = await this.gameCollection.find<ISerializedGame>(
      {},
      {
        projection: {
          gameId: 1,
          name: 1,
        }
      }
    ).toArray();
    return games;
  }

  async saveWorld(game: Game) {
    console.log("Saving world");
    const serializedWorld = game.serialize();
    await this.gameCollection.updateOne({
      gameId: game.gameId,
    }, { $set: serializedWorld }, {
      upsert: true,
    });
  }

  async deleteWorld(worldId: string) {
    await this.gameCollection.deleteOne({ gameId: worldId });
  }
}

