import { TerrainGenerator } from "../../src/world/terrainGenerator";
import { INullableChunkReader } from "../types";
import { Vector2D } from "../utils/vector";
import { Chunk } from "./chunk";


export class ChunkReader {
  private terrainGenerator: TerrainGenerator;

  constructor(
    private chunkReader?: INullableChunkReader
  ) {

  }

  async getChunk(chunkPos: string) {
    let chunk: Chunk | null = null;

    if (this.chunkReader) {
      chunk = await this.chunkReader.getChunk(chunkPos);
      if (chunk) return chunk;
    }

    const chunkPosVec = Vector2D.fromIndex(chunkPos);



    return this.terrainGenerator.generateChunk(chunkPosVec);
  }
}

