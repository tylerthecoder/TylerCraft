import { Cube } from "../entities/cube";
import { Chunk, CHUNK_SIZE } from "./chunk";
import { Entity } from "../entities/entity";

export class World {
  cubes: Cube[] = [];
  chunks: Map<string, Chunk> = new Map();

  constructor() {
    this.gen();
  }

  gen() {
    const size = 5;
    for (let i = -size; i <= size; i++) {
      for (let j = -size; j <= size; j++) {
        const chunk = new Chunk([i, j]);
        this.chunks.set(`${i},${j}`, chunk);
      }
    }
  }

  posToChunk(i: number, j: number): number[] {
    const ord1 = Math.floor(i / CHUNK_SIZE);
    const ord2 = Math.floor(j / CHUNK_SIZE);

    return [ord1, ord2];
  }

  // soon only check chunks the entity is in
  isCollide(ent: Entity): Cube[] {
    const collide: Cube[] = [];
    for (const chunk of this.chunks.values()) {
      const cubes = chunk.isCollide(ent);
      if (cubes.length) {
        collide.push(...cubes);
      }
    }
    return collide;
  }
}
