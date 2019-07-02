import { Cube } from "../entities/cube";
import { Chunk, CHUNK_SIZE } from "./chunk";
import { canvas } from "../canvas/canvas";
import { Entity } from "../entities/entity";
import { Camera } from "../cameras/camera";

export class World {
  cubes: Cube[] = [];
  chunks: Map<string, Chunk> = new Map();

  constructor() {
    this.gen();
  }

  gen() {
    const size = 3;
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

  // maybe just pass a camera not the pos and rot
  render(camera: Camera) {
    canvas.clearCanvas();

    for (const chunk of this.chunks.values()) {
      chunk.render(camera);
    }
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
