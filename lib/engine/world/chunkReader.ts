import { INullableChunkReader } from "../types.js";
import { Chunk } from "./chunk.js";

export class ChunkReader {
  constructor(private chunkReader?: INullableChunkReader) {}

  async getChunk(chunkPos: string) {
    let chunk: Chunk | null = null;

    if (this.chunkReader) {
      chunk = await this.chunkReader.getChunk(chunkPos);
      if (chunk) return chunk;
    }

    throw new Error("Chunk not found");
  }
}
