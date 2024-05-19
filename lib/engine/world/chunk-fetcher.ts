import { IChunkReader, ISerializedGame } from "../game.js";
import { TerrainGenModule, WorldModule } from "../modules.js";
import { Chunk } from "./chunk.js";
import { Vector2D } from "../utils/vector.js";
import { TerrainGenerator } from "./terrainGenerator.js";
import { IConfig } from "../config.js";

export class TerrainGen1 implements IChunkReader {
  private chunkMap = new Map<string, Chunk>();
  private terrainGenerator: TerrainGenerator;

  constructor(serializedGame?: ISerializedGame) {
    this.terrainGenerator = new TerrainGenerator(
      (chunkPos) => this.chunkMap.has(chunkPos.toIndex()),
      (chunkPos) => this.chunkMap.get(chunkPos.toIndex())
    );
    if (!serializedGame) return;
    for (const chunkData of serializedGame.world?.chunks ?? []) {
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

export class TerrainGen2 implements IChunkReader {
  private terrainGenerator: ReturnType<
    typeof TerrainGenModule.getTerrainGenerator
  >;

  constructor(config: IConfig) {
    this.terrainGenerator = TerrainGenModule.getTerrainGenerator(
      Number(config.seed),
      config.terrain.flatWorld
    );
  }

  public async getChunk(chunkPos: string) {
    const terrainVector = Vector2D.fromIndex(chunkPos);
    return this.terrainGenerator.getChunk(terrainVector);
  }
}

export class EmptyChunkReader implements IChunkReader {
  public async getChunk(chunkPos: string) {
    console.log("Empty chunk reader getting pos", chunkPos);
    const terrainVector = Vector2D.fromIndex(chunkPos);
    const chunk = WorldModule.createChunk(terrainVector);
    return chunk;
  }
}
