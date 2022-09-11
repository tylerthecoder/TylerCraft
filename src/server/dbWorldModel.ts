import { Chunk, Game, IChunkReader, ICreateWorldOptions, IGameMetadata, ISerializedChunk, ISerializedGame, IWorldData, TerrainGenerator, Vector2D, WasmWorld, World, WorldModel, WorldModuleTypes} from "@craft/engine";
import { db } from "./app.js";



export class RamChunkReader implements IChunkReader {
  private chunkMap = new Map<string, WorldModuleTypes.Chunk>();
  private terrainGenerator: TerrainGenerator;

  constructor(
    serializedGame?: ISerializedGame,
  ) {
    this.terrainGenerator = new TerrainGenerator(
      (chunkPos) => this.chunkMap.has(chunkPos.toIndex()),
      (chunkPos) => this.chunkMap.get(chunkPos.toIndex()),
    );
    if (!serializedGame) return;
    for (const chunk of serializedGame.world.chunks) {
      const wasmChunk = WasmWorld.Chunk.deserialize(chunk);
      this.chunkMap.set(chunk.chunkId, wasmChunk);
    }
  }

  async getChunk(chunkPos: string, world: World) {
    let serializedChunk = this.chunkMap.get(chunkPos);
    if (!serializedChunk) {
      serializedChunk = this.terrainGenerator.generateChunk(Vector2D.fromIndex(chunkPos));
    }

    return Chunk.fromSerialized(serializedChunk.serialize() as ISerializedChunk, world);
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

