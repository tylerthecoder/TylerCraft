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

  constructor(private game: Game) { }

  getChunkFromPos(chunkPos: Vector2D) {
    return this.chunks.get(chunkPos.toString());
  }

  setChunkAtPos(chunk: Chunk, chunkPos: Vector2D) {
    this.chunks.set(chunkPos.toString(), chunk);
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

  private generateChunk(chunkPos: Vector2D) {
    const generatedChunk = this.terrainGenerator.generateChunk(chunkPos, this);
    this.setChunkAtPos(generatedChunk, chunkPos);

    return generatedChunk;
  }

  getGeneratedChunk(chunkPos: Vector2D): {chunk: Chunk, new: boolean} {
    const chunk = this.getChunkFromPos(chunkPos);

    if (chunk) return {chunk, new: false};
    return { chunk: this.generateChunk(chunkPos), new: true };
  }

  // soon only check chunks the entity is in
  pushOut(ent: Entity) {

    const chunksToCheck: Chunk[] = [];

    const inChunk = this.getChunkFromWorldPoint(ent.pos);
    if (!inChunk) return;

    chunksToCheck.push(inChunk);

    Vector.unitVectors2D.forEach(unitDir => {
      const otherChunkPos = inChunk.chunkPos.add(unitDir);
      const otherChunk = this.getChunkFromPos(otherChunkPos);
      if (otherChunk) chunksToCheck.push(otherChunk);
    });

    for (const chunk of chunksToCheck) {
      const cubes = chunk.pushOut(ent);
    }
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
    const chunk = this.getChunkFromWorldPoint(cube.pos);
    if (!chunk) return;
    chunk.addCube(cube);
    this.game.actions.push(chunk.getBlockUpdateAction());
    this.checkSurroundingChunkForUpdate(chunk, cube.pos);
  }

  removeBlock(cubePos: Vector3D) {
    const chunk = this.getChunkFromWorldPoint(cubePos);
    if (!chunk) return;
    this.checkSurroundingChunkForUpdate(chunk, cubePos);
    chunk.removeCube(cubePos)
    this.game.actions.push(chunk.getBlockUpdateAction());
  }

  lookingAt(cameraPos: IDim, cameraDir: IDim): ILookingAtData {
    const cameraPosVector = new Vector(cameraPos);
    let closestDist = Infinity;
    let closestCube: ILookingAtData;

    // loop over all chunks and then check if they are reachable
    for (const chunk of this.chunks.values()) {
      const isReachable = chunk.circleIntersect(cameraPosVector, CONFIG.player.reach)
      if (!isReachable) continue;

      const cubeData = chunk.lookingAt(cameraPos, cameraDir);
      if (cubeData && closestDist > cubeData.dist && cubeData.dist < CONFIG.player.reach) {
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
