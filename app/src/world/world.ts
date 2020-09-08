import { Cube } from "../entities/cube";
import { Chunk, ILookingAtData } from "./chunk";
import { Entity } from "../entities/entity";
import { Game } from "../game";
import { IDim, IActionType } from "../../types";
import { CONFIG } from "../constants";
import { Vector, Vector3D, Vector2D } from "../utils/vector";
import { TerrainGenerator } from "./terrainGenerator";

export class World {
  chunks: Map<string, Chunk> = new Map();

  terrainGenerator = new TerrainGenerator();

  constructor(private game: Game) {
    this.gen();
  }

  // ToDO make this a function that returns cubes close to an entity
  get cubes(): Cube[] {
    return Array.from(this.chunks.values()).map(chunk => chunk.getCubesItterable()).flat();
  }

  getChunkFromPos(chunkPos: Vector2D) {
    return this.chunks.get(`${chunkPos.get(0)},${chunkPos.get(1)}`) || null;
  }

  setChunkAtPos(chunk: Chunk, chunkPos: Vector2D) {
    this.chunks.set(`${chunkPos.get(0)},${chunkPos.get(1)}`, chunk);
  }

  worldPosToChunkPos(pos: Vector3D): Vector2D {
    return new Vector2D([
      Math.floor(pos.get(0) / CONFIG.terrain.chunkSize),
      Math.floor(pos.get(2) / CONFIG.terrain.chunkSize),
    ]);
  }

  chunkPosToWorldPos(pos: Vector2D, center = false): Vector3D {
    return new Vector3D([
      pos.get(0) * CONFIG.terrain.chunkSize + (center ? CONFIG.terrain.chunkSize / 2 : 0),
      0,
      pos.get(1) * CONFIG.terrain.chunkSize + (center ? CONFIG.terrain.chunkSize / 2 : 0),
    ]);
  }

  getChunkFromWorldPoint(pos: Vector3D) {
    const chunkPos = this.worldPosToChunkPos(pos);
    return this.getChunkFromPos(chunkPos);
  }

  getNearestChunks(pos: IDim, n = 1) {
    const nearbyChunks: Chunk[] = [];

    const nearestChunkPos = this.getChunkFromWorldPoint(new Vector(pos)).chunkPos;

    for (let i=-n; i <= n; i++) {
      for (let j=-n; j <= n; j++) {
        const indexVector = new Vector2D([i, j]);
        const chunkPos = nearestChunkPos.add(indexVector);
        const nearChunk = this.getChunkFromPos(chunkPos);
        if (nearChunk) {
          nearbyChunks.push(nearChunk)
        }
      }
    }

    return nearbyChunks;
  }

  updateChunk(chunkPos: Vector2D) {
    const chunkToUpdate = this.chunks.get(chunkPos.add(new Vector2D([0, 1])).toString());
    if (chunkToUpdate) {
      this.game.actions.push({
        type: IActionType.blockUpdate,
        blockUpdate: {
          chunkId: chunkToUpdate.chunkPos.toString(),
        }
      });
    }
  }

  generateChunk(chunkPos: Vector2D) {
    const generatedChunk = this.terrainGenerator.generateChunk(chunkPos, this);
    this.setChunkAtPos(generatedChunk, chunkPos);

    return generatedChunk;
  }

  getGeneratedChunk(chunkPos: Vector2D): {chunk: Chunk, new: boolean} {
    const chunk = this.getChunkFromPos(chunkPos);

    if (chunk) return {chunk, new: false};
    return { chunk: this.generateChunk(chunkPos), new: true };
  }

  gen() { }

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

  private checkSurroundingChunkForUpdate(chunk: Chunk, pos: Vector3D) {
    Vector.unitVectors2DIn3D.forEach(indexVec => {
      const checkCubePos = pos.add(indexVec);
      const otherChunk = this.getChunkFromWorldPoint(checkCubePos);

      // if this is a different chunk
      if (chunk !== otherChunk) {
        this.game.actions.push(otherChunk.getBlockUpdateAction());
      }
    });
  }

  addBlock(cube: Cube) {
    const cubePosVector = new Vector3D(cube.pos);
    const chunk = this.getChunkFromWorldPoint(cubePosVector);
    chunk.addCube(cube);
    this.game.actions.push(chunk.getBlockUpdateAction());
    this.checkSurroundingChunkForUpdate(chunk, cubePosVector);
  }

  removeBlock(cube: Cube) {
    const cubePosVector = new Vector3D(cube.pos);
    const chunk = this.getChunkFromWorldPoint(cubePosVector);
    chunk.removeCube(cube)
    this.game.actions.push(chunk.getBlockUpdateAction());
    this.checkSurroundingChunkForUpdate(chunk, cubePosVector);
  }

  lookingAt(cameraPos: IDim, cameraDir: IDim): ILookingAtData {
    const camerPosVector = new Vector(cameraPos);
    let closestDist = Infinity;
    let closestCube: ILookingAtData;

    // loop over all chunks and then check if they are reachable
    for (const chunk of this.chunks.values()) {
      const isReachable = chunk.circleIntersect(camerPosVector, CONFIG.playerReach)
      if (!isReachable) continue;

      const cubeData = chunk.lookingAt(cameraPos, cameraDir);
      if (cubeData && closestDist > cubeData.dist && cubeData.dist < CONFIG.playerReach) {
        closestDist = cubeData.dist;
        closestCube = cubeData;
      }
    }

    if (!closestCube) {
      return null;
    }

    return closestCube;
  }
}
