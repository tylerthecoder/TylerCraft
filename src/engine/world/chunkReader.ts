import { INullableChunkReader } from "../types.js";
import { Chunk } from "./chunk.js";
import {World} from "./world.js";


export class ChunkReader {
  constructor(
    private chunkReader?: INullableChunkReader
  ) {

  }

  async getChunk(chunkPos: string, world: World) {
    let chunk: Chunk | null = null;

    if (this.chunkReader) {
      chunk = await this.chunkReader.getChunk(chunkPos, world);
      if (chunk) return chunk;
    }

    throw new Error("Chunk not found");

    // const chunkPosVec = Vector2D.fromIndex(chunkPos);

    // return this.terrainGenerator.generateChunk(chunkPosVec);
  }
}

