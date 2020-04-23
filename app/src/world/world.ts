import { Cube } from "../entities/cube";
import { Chunk, CHUNK_SIZE } from "./chunk";
import { Entity } from "../entities/entity";
import { Game } from "../game";
import { Camera } from "../../client/cameras/camera";

export class World {
  chunks: Map<string, Chunk> = new Map();

  constructor(private game: Game) {
    this.gen();
  }

  // ToDO make this a function that returns cubes close to an entity
  get cubes(): Cube[] {
    return Array.from(this.chunks.values()).map(chunk => chunk.cubes).flat();
  }

  gen() {
    const size = 1;
    for (let i = -size; i < size; i++) {
      for (let j = -size; j < size; j++) {
        const chunk = new Chunk([i, j], this.game);
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

  addBlock(cube: Cube) {
    for (const chunk of this.chunks.values()) {
      if (chunk.containsCube(cube)) {
        chunk.addCube(cube)
        return;
      }
    }
  }

  lookingAt(camera: Camera) {
    for (const chunk of this.chunks.values()) {
      const cubes = chunk.lookingAt(camera);
      if (cubes.length > 0) {
        return cubes[0];
      }
    }
  }
}
