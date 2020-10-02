import { Cube } from "../entities/cube";
import { Chunk, ILookingAtData, ISerializedChunk } from "./chunk";
import { Entity } from "../entities/entity";
import { Game } from "../game";
import { IDim, IActionType } from "../../types";
import { CONFIG } from "../constants";
import { Vector, Vector3D, Vector2D } from "../utils/vector";
import { ISerializedTerrainGenerator, TerrainGenerator } from "./terrainGenerator";
import { IChunkReader } from "../worldModel";

export interface ISerializedWorld {
  chunks: ISerializedChunk[];
  tg: ISerializedTerrainGenerator;
}

export class World {
  private terrainGenerator: TerrainGenerator;
  private chunks: Map<string, Chunk>;
  public loadingChunks = new Set<string>();
  public loadedChunks = new Set<string>();

  constructor(
    private game: Game,
    private chunkReader: IChunkReader,
    data?: ISerializedWorld,
  ) {
    if (data) {
      this.terrainGenerator = new TerrainGenerator(this, data.tg);

      const chunks = data.chunks.map(Chunk.deserialize);

      const chunksMap = new Map();
      for (const chunk of chunks) {
        chunksMap.set(chunk.chunkPos.toString(), chunk);
      }
      this.chunks = chunksMap;

      this.chunks.forEach(chunk => this.updateChunk(chunk.chunkPos));

    } else {
      this.terrainGenerator = new TerrainGenerator(this);
      this.chunks = new Map();
    }
  }

  // We just aren't going to serialize the terrain generator for now. Hopefully later we find a better way to do this
  serialize(): ISerializedWorld {
    const serializedTG = this.terrainGenerator.serialize();
    const serializedChunks = Array.from(this.chunks.values()).map(chunk => chunk.serialize());
    return {
      chunks: serializedChunks,
      tg: serializedTG,
    }
  }

  getChunkFromPos(chunkPos: Vector2D, config?: {generateIfNotFound?: boolean, loadIfNotFound?: boolean}) {
    const chunk = this.chunks.get(chunkPos.toString());
    if (!chunk && config?.loadIfNotFound) this.loadChunk(chunkPos);
    if (!chunk && config?.generateIfNotFound) return this.generateChunk(chunkPos);
    return chunk;
  }

  setChunkAtPos(chunk: Chunk, chunkPos: Vector2D) {
    this.chunks.set(chunkPos.toString(), chunk);
    this.loadedChunks.add(chunkPos.toString());
  }

  getChunks(): IterableIterator<Chunk> {
    return this.chunks.values();
  }

  hasChunk(chunkPos: Vector2D): boolean {
    return this.chunks.has(chunkPos.toString());
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

  loadChunk(chunkPos: Vector2D) {
    // no repeat loading
    if (this.loadingChunks.has(chunkPos.toString())) {
      return;
    }
    this.loadingChunks.add(chunkPos.toString());
    this.chunkReader.getChunk(chunkPos.toString()).then(chunk => {
      // this should only happen on the client side when single player
      // and on the server side when multiplayer
      if (!chunk) chunk = this.terrainGenerator.generateChunk(chunkPos);
      this.setChunkAtPos(chunk, chunkPos);
    })
  }

  getChunkFromWorldPoint(pos: Vector3D) {
    const chunkPos = this.worldPosToChunkPos(pos);
    return this.getChunkFromPos(chunkPos);
  }

  getBlockFromWorldPoint(pos: Vector3D): Cube | null {
    const chunk = this.getChunkFromWorldPoint(pos);
    if (!chunk) return null;
    const cube = chunk.cubes.get(pos.floor().toString());
    if (cube) return cube;
    return null;
  }

  updateChunk(chunkPos: Vector2D) {
    const chunkToUpdate = this.chunks.get(chunkPos.add(new Vector2D([0, 1])).toString());
    if (chunkToUpdate) {
      this.game.addAction({
        type: IActionType.blockUpdate,
        blockUpdate: {
          chunkId: chunkToUpdate.chunkPos.toString(),
        }
      });
    }
  }

  private generateChunk(chunkPos: Vector2D) {
    console.log("Generating chunk", chunkPos, this.game.gameId);
    const generatedChunk = this.terrainGenerator.generateChunk(chunkPos);
    this.setChunkAtPos(generatedChunk, chunkPos);
    return generatedChunk;
  }

  // load the starting chunks
  load() {
    for (let i = -CONFIG.loadDistance; i < CONFIG.loadDistance; i++) {
      for (let j = -CONFIG.loadDistance; j < CONFIG.loadDistance; j++) {
        const chunkPos = new Vector2D([i, j]);
        if (!this.hasChunk(chunkPos))
          this.loadChunk(chunkPos);
      }
    }
  }

  update(entities: Entity[]) {
    for (const entity of entities) {
      this.pushOut(entity);

      for (const e of entities) {
        if (e === entity) continue;
        const isCollide = e.isCollide(entity);
        if (isCollide) {
          entity.pushOut(e);
        }
      }
    }
  }

  // soon only check chunks the entity is in
  pushOut(ent: Entity) {
    const inChunk = this.getChunkFromWorldPoint(ent.pos);
    if (!inChunk) return;

    const chunksToCheck: Chunk[] = [inChunk];

    Vector.unitVectors2D.forEach(unitDir => {
      const otherChunkPos = inChunk.chunkPos.add(unitDir);
      const otherChunk = this.getChunkFromPos(otherChunkPos);
      if (otherChunk) chunksToCheck.push(otherChunk);
    });

    for (const chunk of chunksToCheck) {
      chunk.pushOut(ent);
    }
  }

  private checkSurroundingChunkForUpdate(chunk: Chunk, pos: Vector3D) {
    Vector.unitVectors2DIn3D.forEach(indexVec => {
      const checkCubePos = pos.add(indexVec);
      const otherChunk = this.getChunkFromWorldPoint(checkCubePos);

      // if this is a different chunk
      if (otherChunk && chunk !== otherChunk) {
        this.game.addAction(otherChunk.getBlockUpdateAction());
      }
    });
  }

  addBlock(cube: Cube) {
    console.log("Adding block", cube, this.game.gameId);
    const chunk = this.getChunkFromWorldPoint(cube.pos);
    if (!chunk) return;
    chunk.addCube(cube);
    this.game.addAction(chunk.getBlockUpdateAction());
    this.checkSurroundingChunkForUpdate(chunk, cube.pos);
  }

  removeBlock(cubePos: Vector3D) {
    const chunk = this.getChunkFromWorldPoint(cubePos);
    if (!chunk) return;
    this.checkSurroundingChunkForUpdate(chunk, cubePos);
    chunk.removeCube(cubePos)
    this.game.addAction(chunk.getBlockUpdateAction());
  }

  lookingAt(cameraPos: Vector3D, cameraDir: IDim): ILookingAtData | null {
    let closestDist = Infinity;
    let closestCube: ILookingAtData|null = null;

    // loop over all chunks and then check if they are reachable
    for (const chunk of this.chunks.values()) {
      const isReachable = chunk.circleIntersect(cameraPos, CONFIG.player.reach)
      if (!isReachable) continue;

      const cubeData = chunk.lookingAt(cameraPos.data as IDim, cameraDir);
      if (cubeData && closestDist > cubeData.dist && cubeData.dist < CONFIG.player.reach) {
        closestDist = cubeData.dist;
        closestCube = cubeData;
      }
    }

    return closestCube;
  }



}