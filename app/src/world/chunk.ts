import { Cube } from "../entities/cube";
import { Entity } from "../entities/entity";
import { IDim } from "../../types";

export const CHUNK_SIZE = 5;

export class Chunk {
  cubes: Cube[] = [];

  constructor(public chunkPos: number[]) {
    this.generate();
  }

  get pos() {
    return [this.chunkPos[0] * CHUNK_SIZE, 0, this.chunkPos[1] * CHUNK_SIZE];
  }

  // use seed later down the line
  generate() {
    for (let i = 0; i < CHUNK_SIZE; i++) {
      for (let j = 0; j < CHUNK_SIZE; j++) {
        const cubePos = [this.pos[0] + i, 0, this.pos[2] + j];
        const cube = new Cube(cubePos as IDim);
        this.cubes.push(cube);
      }
    }
  }

  // change this to chunks instead of cubes later
  isCollide(ent: Entity): Cube[] {
    const collide: Cube[] = [];
    for (const cube of this.cubes) {
      if (cube.isCollide(ent)) {
        collide.push(cube);
      }
    }
    return collide;
  }
}
