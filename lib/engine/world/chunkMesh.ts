import { Cube } from "../index.js";
import { Direction } from "../utils/vector.js";

export class ChunkMesh {
  constructor(
    public mesh: Array<{ block: Cube; faces: Direction[] }>,
    public chunkPos: { x: number; y: number }
  ) {}
}
