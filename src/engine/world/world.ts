import CubeHelpers, { Cube, CUBE_DIM } from "../entities/cube.js";
import { Chunk, ILookingAtData, ISerializedChunk } from "./chunk.js";
import { Entity } from "../entities/entity.js";
import { Game } from "../game.js";
import { IChunkReader } from "../types.js";
import { CONFIG } from "../config.js";
import { Vector3D, Vector2D } from "../utils/vector.js";
import { WasmWorld } from "../modules.js";
import { BLOCK_DATA } from "../blockdata.js";
import { ICameraData } from "../camera.js";

export interface ISerializedWorld {
  chunks: ISerializedChunk[];
  // tg: ISerializedTerrainGenerator;
}

export class World {
  // public terrainGenerator: TerrainGenerator;
  private chunks: Map<string, Chunk>;
  public loadingChunks = new Set<string>();
  public loadedChunks = new Set<string>();

  private wasmWorld: ReturnType<typeof WasmWorld.World.new_wasm>;

  constructor(
    private game: Game,
    private chunkReader: IChunkReader,
    data?: ISerializedWorld,
  ) {

    this.wasmWorld = new WasmWorld.World();

    console.log("WASM wordl", this.wasmWorld);


    if (data) {
      // this.terrainGenerator = new TerrainGenerator(this.hasChunk.bind(this), this.getChunkFromPos.bind(this), data.tg);

      data.chunks.map(this.wasmWorld.deserialize_chunk);

      const chunksMap = new Map();
      for (const chunk of data.chunks) {
        const chunkClass = new Chunk(this, this.wasmWorld, chunk.chunkPos);
        chunksMap.set(chunk.chunkPos.toIndex(), chunkClass);
      }
      this.chunks = chunksMap;

      // this.chunks.forEach(chunk => this.updateChunk(chunk.chunkPos));

    } else {
      // this.terrainGenerator = new TerrainGenerator(this.hasChunk.bind(this), this.getChunkFromPos.bind(this));
      this.chunks = new Map();
    }

    // Compute all the chunk faces
    // TODO think this through better. Might take a long time to start if there are a lot of chunks
    for (const chunk of this.chunks.values()) {
      chunk.calculateVisibleFaces(this);
    }


  }

  // We just aren't going to serialize the terrain generator for now. Hopefully later we find a better way to do this
  serialize(): ISerializedWorld {
    // const serializedTG = this.terrainGenerator.serialize();
    const serializedChunks = Array.from(this.chunks.values()).map(chunk => chunk.serialize());
    return {
      chunks: serializedChunks,
      // tg: serializedTG,
    }
  }

  // Helper static methods
  static worldPosToChunkPos(pos: Vector3D): Vector2D {
    return new Vector2D([
      Math.floor(pos.get(0) / CONFIG.terrain.chunkSize),
      Math.floor(pos.get(2) / CONFIG.terrain.chunkSize),
    ]);
  }

  static chunkPosToWorldPos(pos: Vector2D, center = false): Vector3D {
    return new Vector3D([
      pos.get(0) * CONFIG.terrain.chunkSize + (center ? CONFIG.terrain.chunkSize / 2 : 0),
      0,
      pos.get(1) * CONFIG.terrain.chunkSize + (center ? CONFIG.terrain.chunkSize / 2 : 0),
    ]);
  }

  // TODO make this a lookup instead of an array search
  getChunkById(chunkId: string) {
    for (const chunk of this.getChunks()) {
      if (chunk.uid === chunkId) return chunk;
    }
    throw new Error("Chunk with id " + chunkId + " not found");
  }

  getChunkFromPos(chunkPos: Vector2D, config?: { loadIfNotFound?: boolean }) {
    const chunk = this.chunks.get(chunkPos.toIndex());
    if (!chunk && config?.loadIfNotFound) this.loadChunk(chunkPos);
    // if (!chunk && config?.generateIfNotFound) return this.generateChunk(chunkPos);
    return chunk;
  }

  setChunkAtPos(chunk: Chunk, chunkPos: Vector2D) {
    this.chunks.set(chunkPos.toIndex(), chunk);
    this.loadedChunks.add(chunkPos.toIndex());
  }

  updateChunk(chunkPos: Vector2D, chunkData: ISerializedChunk) {
    const chunk = this.getChunkFromPos(chunkPos);
    if (!chunk) return;
    chunk.set(chunkData);
    chunk.calculateVisibleFaces(this);
  }

  getChunks(): IterableIterator<Chunk> {
    return this.chunks.values();
  }

  hasChunk(chunkPos: Vector2D): boolean {
    return this.chunks.has(chunkPos.toIndex());
  }

  async loadChunk(chunkPos: Vector2D): Promise<void> {
    // no repeat loading
    if (this.loadingChunks.has(chunkPos.toIndex())) {
      return;
    }

    this.loadingChunks.add(chunkPos.toIndex());
    return new Promise(resolve => {
      this.chunkReader.getChunk(chunkPos.toIndex()).then(chunk => {
        // this should only happen on the client side when single player
        // and on the server side when multiplayer
        // if (!chunk) chunk = this.terrainGenerator.generateChunk(chunkPos);
        this.setChunkAtPos(chunk, chunkPos);
        chunk.calculateVisibleFaces(this);
        resolve();
      })
    });
  }

  getChunkFromWorldPoint(pos: Vector3D) {
    const chunkPos = World.worldPosToChunkPos(pos);
    return this.getChunkFromPos(chunkPos);
  }

  getBlockFromWorldPoint(pos: Vector3D): Cube | null {
    return this.wasmWorld.get_block_wasm(pos.get(0), pos.get(1), pos.get(2));
    // const chunk = this.getChunkFromWorldPoint(pos);
    // if (!chunk) return null;
    // const cube = chunk.blocks.get(pos.floor());
    // if (cube) return cube;
    // return null;
  }

  // load the starting chunks
  async load() {
    const loadPromises: Promise<void>[] = [];
    for (let i = -CONFIG.loadDistance; i < CONFIG.loadDistance; i++) {
      for (let j = -CONFIG.loadDistance; j < CONFIG.loadDistance; j++) {
        const chunkPos = new Vector2D([i, j]);
        if (!this.hasChunk(chunkPos)) {
          const loadPromise = this.loadChunk(chunkPos);
          loadPromises.push(loadPromise);
        }
      }
    }
    await Promise.all(loadPromises);
  }

  update(entities: Entity[]) {
    for (const entity of entities) {
      // if ((entity as Spectator).intangible) return;

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
    const entDim = ent instanceof Entity ? ent.dim : CUBE_DIM;

    const ifCubeExistThenPushOut = (pos: Vector3D) => {
      pos.data = pos.data.map(Math.floor);

      const cube = this.getBlockFromWorldPoint(pos);
      if (!cube) return;

      const cubeData = BLOCK_DATA.get(cube.type)!;

      if (!CubeHelpers.isCollide(cube, ent)) return;
      if (!cubeData) return;
      if (cubeData.intangible) return;

      if (ent instanceof Entity) {
        ent.pushOut(cube);
      }
    }

    // check the edges of the ent to see if it is intersecting the cubes
    for (let x = 0; x < entDim[0]; x++) {
      const centerX = x + .5;
      for (let y = 0; y < entDim[1]; y++) {
        const centerY = y + .5;
        for (let z = 0; z < entDim[2]; z++) {
          const centerZ = z + .5;
          const center = ent.pos.add(new Vector3D([centerX, centerY, centerZ]));

          // check the unit vectors first
          for (const vec of Vector3D.unitVectors) {
            const checkingPos = center.add(vec);
            ifCubeExistThenPushOut(checkingPos);
          }

          for (const vec of Vector3D.edgeVectors) {
            const checkingPos = center.add(vec);
            ifCubeExistThenPushOut(checkingPos);
          }

          for (const vec of Vector3D.cornerVectors) {
            const checkingPos = center.add(vec);
            ifCubeExistThenPushOut(checkingPos);
          }
        }
      }
    }



    // const inChunk = this.getChunkFromWorldPoint(ent.pos);
    // if (!inChunk) return;

    // const chunksToCheck: Chunk[] = [inChunk];

    // Vector2D.unitVectors.forEach(unitDir => {
    //   const otherChunkPos = inChunk.chunkPos.add(unitDir);
    //   const otherChunk = this.getChunkFromPos(otherChunkPos);
    //   if (otherChunk) chunksToCheck.push(otherChunk);
    // });

    // for (const chunk of chunksToCheck) {
    //   chunk.pushOut(ent);
    // }
  }

  private checkSurroundingChunkForUpdate(chunk: Chunk, pos: Vector3D) {
    Vector3D.edgeVectorsStripY.forEach(indexVec => {
      const checkCubePos = pos.add(indexVec);
      const otherChunk = this.getChunkFromWorldPoint(checkCubePos);

      // if this is a different chunk
      if (otherChunk && chunk !== otherChunk) {
        this.game.stateDiff.updateChunk(chunk.uid);
        // TODO recalculate faces
      }
    });
  }

  addBlock(cube: Cube) {
    // Check if an entity is in the way
    for (const entity of this.game.entities.iterable()) {
      if (CubeHelpers.isPointInsideOfCube(cube, entity.pos)) {
        console.log("Not adding block, entity in the way");
        return;
      }
    }

    console.log("Adding block", cube, this.game.gameId);
    const chunk = this.getChunkFromWorldPoint(cube.pos);
    if (!chunk) return;
    this.wasmWorld.add_block_wasm({
      block_type: cube.type,
      extra_data: cube.extraData,
      world_pos: {
        x: cube.pos.get(0),
        y: cube.pos.get(1),
        z: cube.pos.get(2),
      }
    });


    // chunk.blocks.add(cube);
    // chunk.calculateVisibleFaces(this);
    this.game.stateDiff.updateChunk(chunk.uid);
    this.checkSurroundingChunkForUpdate(chunk, cube.pos);
  }

  removeBlock(cubePos: Vector3D) {
    console.log("Removing block", cubePos);
    const chunk = this.getChunkFromWorldPoint(cubePos);
    if (!chunk) return;
    this.wasmWorld.remove_block_wasm(cubePos.get(0), cubePos.get(1), cubePos.get(2));
    // chunk.blocks.remove(cubePos)
    chunk.calculateVisibleFaces(this);
    this.checkSurroundingChunkForUpdate(chunk, cubePos);
    this.game.stateDiff.updateChunk(chunk.uid);
  }

  lookingAt(camera: ICameraData): ILookingAtData | null {
    let closestDist = Infinity;
    let closestCube: ILookingAtData | null = null;

    // loop over all chunks and then check if they are reachable
    for (const chunk of this.chunks.values()) {
      const isReachable = chunk.circleIntersect(new Vector3D(camera.pos), CONFIG.player.reach)
      if (!isReachable) continue;

      const cubeData = chunk.lookingAt(camera);
      if (cubeData && closestDist > cubeData.dist && cubeData.dist < CONFIG.player.reach) {
        closestDist = cubeData.dist;
        closestCube = cubeData;
      }
    }

    return closestCube;
  }
}
