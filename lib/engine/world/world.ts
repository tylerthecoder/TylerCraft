import CubeHelpers, {
  Cube,
  CUBE_DIM,
  ISerializedCube,
  WasmCube,
} from "../entities/cube.js";
import { Chunk, ILookingAtData, ISerializedChunk } from "./chunk.js";
import { Entity } from "../entities/entity.js";
import { CONFIG } from "../config.js";
import {
  Vector3D,
  Vector2D,
  Direction,
  getDirectionFromString,
} from "../utils/vector.js";
import { WorldModule, WorldModuleTypes } from "../modules.js";
import { GameStateDiff } from "../gameStateDiff.js";
import { ChunkMesh } from "./chunkMesh.js";
import { CameraRay, Game, getBlockData, IChunkReader } from "../index.js";

type ISerializedChunkHolder = ISerializedChunk[];

export class ChunkHolder {
  private chunks = new Map<string, Chunk>();
  private loadingChunks = new Map<string, Promise<Chunk>>();
  private chunksToSend: Chunk[] = [];

  constructor(
    private wasmWorld: WorldModuleTypes.World,
    private chunkReader: IChunkReader,
    data?: ISerializedChunkHolder
  ) {
    if (data) {
      data.forEach((ser) => {
        const chunk = WorldModule.createChunkFromSerialized(ser);
        this.addOrUpdate(chunk);
      });
    }
  }

  addOrUpdate(chunk: Chunk): void {
    this.chunks.set(chunk.pos.toIndex(), chunk);
    const serialized = chunk.serialize();
    this.wasmWorld.insert_chunk_wasm(serialized);
  }

  has(pos: Vector2D): boolean {
    return this.wasmWorld.has_chunk_wasm(pos.toCartIntObj());
  }

  get(pos: Vector2D): Chunk | null {
    return this.chunks.get(pos.toIndex()) ?? null;
  }

  getAll(): Chunk[] {
    return Array.from(this.chunks.values());
  }

  async loadAll(): Promise<Chunk[]> {
    return Promise.all(this.loadingChunks.values());
  }

  startLoadingChunk(pos: Vector2D): void {
    const chunkId = pos.toIndex();

    if (this.chunks.has(chunkId)) {
      return;
    }

    if (this.loadingChunks.has(chunkId)) {
      return;
    }

    const chunkPromise = this.chunkReader.getChunk(chunkId);

    const wrappedChunkPromise = chunkPromise
      .then((chunk) => {
        this.chunksToSend.push(chunk);
        this.addOrUpdate(chunk);
        this.loadingChunks.delete(chunkId);
        return chunk;
      })
      .catch((err) => {
        this.loadingChunks.delete(chunkId);
        throw err;
      });

    this.loadingChunks.set(chunkId, wrappedChunkPromise);
  }

  async immediateLoadChunk(pos: Vector2D): Promise<Chunk> {
    const chunkId = pos.toIndex();
    const chunk = await this.chunkReader.getChunk(chunkId);
    this.chunksToSend.push(chunk);
    this.addOrUpdate(chunk);
    return chunk;
  }

  getNewlyLoadedChunk(): Chunk | null {
    return this.chunksToSend.shift() ?? null;
  }
}

export interface ISerializedWorld {
  chunks: ISerializedChunkHolder;
}

export class World {
  public chunks: ChunkHolder;

  static async make(
    chunkReader: IChunkReader,
    data?: ISerializedWorld
  ): Promise<World> {
    const world = WorldModule.createWorld(chunkReader, data);
    await world.load();
    console.log("World loaded");
    return world;
  }

  constructor(
    public wasmWorld: WorldModuleTypes.World,
    chunkReader: IChunkReader,
    data?: ISerializedWorld
  ) {
    this.chunks = new ChunkHolder(wasmWorld, chunkReader, data?.chunks);
  }

  serialize(): ISerializedWorld {
    const serializedChunks = this.chunks
      .getAll()
      .map((chunk) => chunk.serialize());
    return {
      chunks: serializedChunks,
    };
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
      pos.get(0) * CONFIG.terrain.chunkSize +
        (center ? CONFIG.terrain.chunkSize / 2 : 0),
      0,
      pos.get(1) * CONFIG.terrain.chunkSize +
        (center ? CONFIG.terrain.chunkSize / 2 : 0),
    ]);
  }

  static chunkIdToChunkPos(chunkId: string): Vector2D {
    const [x, y] = chunkId.split(",").map((s) => parseInt(s));
    return new Vector2D([x, y]);
  }

  // ===================
  //    Getters
  // ===================

  // TODO make this a lookup instead of an array search
  getChunkById(chunkId: string) {
    for (const chunk of this.getChunks()) {
      if (chunk.uid === chunkId) return chunk;
    }
    throw new Error("Chunk with id " + chunkId + " not found");
  }

  getChunkFromPos(chunkPos: Vector2D) {
    const chunk = this.chunks.get(chunkPos);
    return chunk;
  }

  getChunks(): Chunk[] {
    return this.chunks.getAll();
  }

  getChunkFromWorldPoint(pos: Vector3D) {
    const chunkPos = World.worldPosToChunkPos(pos);
    return this.getChunkFromPos(chunkPos);
  }

  getChunkMesh(chunkPos: Vector2D): ChunkMesh {
    const wasmMesh: Array<[WasmCube, { data: Array<boolean> }]> =
      this.wasmWorld.get_chunk_mesh_wasm(chunkPos.toCartIntObj());

    const betterMesh = wasmMesh.map(([cube, { data }]) => {
      const block = CubeHelpers.fromWasmCube(cube);
      const faces = data
        .map((b, i) => (b ? i : -1))
        .filter((i) => i !== -1) as Direction[];
      return {
        block,
        faces,
      };
    });

    return new ChunkMesh(betterMesh, chunkPos.toCartIntObj());
  }

  getBlockFromWorldPoint(pos: Vector3D): Cube | null {
    const wasmBlock: ISerializedCube = this.wasmWorld.get_block_wasm(
      pos.toCartIntObj()
    );
    return CubeHelpers.fromWasmCube(wasmBlock);
  }

  updateChunk(chunkPos: Vector2D, chunkData: ISerializedChunk) {
    const chunk = this.getChunkFromPos(chunkPos);
    if (!chunk) return;
    chunk.set(chunkData);
  }

  addOrUpdateChunk(chunk: Chunk) {
    this.chunks.addOrUpdate(chunk);
  }

  hasChunk(chunkPos: Vector2D): boolean {
    return this.chunks.has(chunkPos);
  }

  // load the starting chunks
  // called before the world is passed on to the game
  private async load() {
    this.loadChunksAroundPoint(new Vector3D([0, 0, 0]));
    await this.chunks.loadAll();
  }

  loadChunksAroundPoint(pos: Vector3D): void {
    const centerChunkPos = World.worldPosToChunkPos(pos);

    if (!CONFIG.terrain.generateChunks) {
      return;
    }

    for (let i = -CONFIG.loadDistance; i < CONFIG.loadDistance; i++) {
      for (let j = -CONFIG.loadDistance; j < CONFIG.loadDistance; j++) {
        const chunkPos = new Vector2D([
          centerChunkPos.get(0) + i,
          centerChunkPos.get(1) + j,
        ]);
        this.chunks.startLoadingChunk(chunkPos);
      }
    }
  }

  update(game: Game, entities: Entity[]) {
    for (const entity of entities) {
      // if ((entity as Spectator).intangible) return;

      this.pushOut(game, entity);

      for (const e of entities) {
        if (e === entity) continue;
        const isCollide = e.isCollide(entity);
        if (isCollide) {
          entity.pushOut(game, e);
        }
      }
    }
  }

  tryMove(entity: Entity, vel: Vector3D): Vector3D {
    const endPos = {
      x: entity.pos.get(0) + vel.get(0),
      y: entity.pos.get(1) + vel.get(1),
      z: entity.pos.get(2) + vel.get(2),
    };
    const newPos = this.wasmWorld.move_rect3_wasm(
      {
        pos: {
          x: entity.pos.get(0),
          y: entity.pos.get(1),
          z: entity.pos.get(2),
        },
        dim: {
          x: entity.dim[0],
          y: entity.dim[1],
          z: entity.dim[2],
        },
      },
      endPos
    );
    return new Vector3D([newPos.x, newPos.y, newPos.z]);
  }

  pushOut(game: Game, ent: Entity) {
    const entDim = ent instanceof Entity ? ent.dim : CUBE_DIM;

    const ifCubeExistThenPushOut = (pos: Vector3D) => {
      pos.data = pos.data.map(Math.floor);

      const cube = this.getBlockFromWorldPoint(pos);
      if (!cube) return;

      const cubeData = getBlockData(cube.type);

      if (!CubeHelpers.isCollide(cube, ent)) return;
      if (!cubeData) return;
      if (cubeData.intangible) return;

      if (ent instanceof Entity) {
        ent.pushOut(game, cube);
      }
    };

    // check the edges of the ent to see if it is intersecting the cubes
    for (let x = 0; x < entDim[0]; x++) {
      const centerX = x + 0.5;
      for (let y = 0; y < entDim[1]; y++) {
        const centerY = y + 0.5;
        for (let z = 0; z < entDim[2]; z++) {
          const centerZ = z + 0.5;
          const center = ent.pos.add(new Vector3D([centerX, centerY, centerZ]));
          // check the unit vectors first
          for (const vec of [
            ...Vector3D.unitVectors,
            ...Vector3D.edgeVectors,
            ...Vector3D.cornerVectors,
          ]) {
            const checkingPos = center.add(vec);
            ifCubeExistThenPushOut(checkingPos);
          }
        }
      }
    }
  }

  async addBlock(
    stateDiff: GameStateDiff,
    cube: Cube,
    options?: { loadChunkIfNotLoaded: boolean }
  ) {
    console.log("World: Adding block", cube);
    let chunk = this.getChunkFromWorldPoint(cube.pos);
    if (!chunk) {
      if (options?.loadChunkIfNotLoaded) {
        chunk = await this.chunks.immediateLoadChunk(
          World.worldPosToChunkPos(cube.pos)
        );
      } else {
        throw new Error("Trying to place block in unloaded chunk");
      }
    }
    const diff: { chunk_ids: string[] } = this.wasmWorld.add_block_wasm({
      block_type: cube.type,
      extra_data: "None",
      world_pos: {
        x: cube.pos.get(0),
        y: cube.pos.get(1),
        z: cube.pos.get(2),
      },
    });

    // Very important to update the chunk too
    chunk.addBlock(cube);

    console.log("Chunks to updated after adding block: ", diff);

    diff.chunk_ids.forEach((id) => stateDiff.updateChunk(id));
  }

  removeBlock(stateDiff: GameStateDiff, cubePos: Vector3D) {
    console.log("Removing block", cubePos);
    const chunk = this.getChunkFromWorldPoint(cubePos);
    if (!chunk) return;
    const diff: { chunk_ids: string[] } = this.wasmWorld.remove_block_wasm(
      cubePos.get(0),
      cubePos.get(1),
      cubePos.get(2)
    );

    chunk.removeBlock(cubePos);

    console.log("Diff from removing block", diff);
    diff.chunk_ids.forEach((id) => stateDiff.updateChunk(id));
  }

  lookingAt(camera: CameraRay): ILookingAtData | null {
    const lookingData: {
      block: ISerializedCube;
      face: string;
      distance: number;
    } | null = this.wasmWorld.get_pointed_at_block_wasm(camera);

    console.log("Cam looking at ", lookingData, camera);

    if (!lookingData) return null;

    return {
      cube: CubeHelpers.fromWasmCube(lookingData.block),
      face: getDirectionFromString(lookingData.face),
      dist: lookingData.distance,
    };
  }
}
