import { Cube } from "../entities/cube";
import { Chunk } from "./chunk";
import { Entity } from "../entities/entity";
import { Game } from "../game";
import { IDim } from "../../types";
import { CONFIG } from "../constants";
import { Vector, Vector3D } from "../utils/vector";

export class World {
  chunks: Map<string, Chunk> = new Map();

  constructor(private game: Game) {
    this.gen();
  }

  // ToDO make this a function that returns cubes close to an entity
  get cubes(): Cube[] {
    return Array.from(this.chunks.values()).map(chunk => chunk.cubes).flat();
  }

  getChunkFromPos(x: number, y: number) {
    return this.chunks.get(`${x},${y}`) || null;
  }

  getChunkFromWorldPoint(pos: Vector3D) {
    const x = Math.floor(pos.get(0) / CONFIG.chunkSize);
    const y = Math.floor(pos.get(2) / CONFIG.chunkSize);
    return this.getChunkFromPos(x, y);
  }

  getNearestChunks(pos: IDim, n = 1) {
    const nearbyChunks: Chunk[] = [];

    const nearestChunkPos = this.getChunkFromWorldPoint(new Vector(pos)).chunkPos;

    console.log(nearestChunkPos);

    for (let i=-n; i <= n; i++) {
      for (let j=-n; j <= n; j++) {
        const nearChunk = this.getChunkFromPos( nearestChunkPos[0] + i, nearestChunkPos[1] + j)
        if (nearChunk) {
          nearbyChunks.push(nearChunk)
        }
      }
    }

    return nearbyChunks;
  }

  gen() {
    for (let i = -CONFIG.chunkDim; i < CONFIG.chunkDim; i++) {
      for (let j = -CONFIG.chunkDim; j < CONFIG.chunkDim; j++) {
        const chunk = new Chunk([i, j], this.game);
        this.chunks.set(`${i},${j}`, chunk);
      }
    }
  }

  posToChunk(i: number, j: number): number[] {
    const ord1 = Math.floor(i / CONFIG.chunkSize);
    const ord2 = Math.floor(j / CONFIG.chunkSize);

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

  removeBlock(cube: Cube) {
    for (const chunk of this.chunks.values()) {
      if (chunk.containsCube(cube)) {
        chunk.removeCube(cube)
        return;
      }
    }
  }

  lookingAt(cameraPos: IDim, cameraDir: IDim) {
    let closestDist = Infinity;
    let closestCube;

    const closestChunks = this.getNearestChunks(cameraPos, 2);

    // don't loop over all chunks idiot
    // only loop over nearby chunks
    for (const chunk of closestChunks) {
      const cubeData = chunk.lookingAt(cameraPos, cameraDir);
      if (cubeData && closestDist > cubeData.dist && cubeData.dist < CONFIG.playerReach) {
        closestDist = cubeData.dist;
        closestCube = cubeData;
      }
    }
    return closestCube;
  }
}
