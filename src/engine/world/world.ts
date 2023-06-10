import CubeHelpers, { Cube, CUBE_DIM, ISerializedCube, WasmCube } from "../entities/cube.js";
import { Chunk, ILookingAtData, ISerializedChunk } from "./chunk.js";
import { Entity } from "../entities/entity.js";
import { IChunkReader } from "../types.js";
import { CONFIG } from "../config.js";
import { Vector3D, Vector2D, Direction, getDirectionFromString } from "../utils/vector.js";
import WorldModule, { WorldModuleTypes } from "../modules.js";
import { BLOCK_DATA } from "../blockdata.js";
import { GameStateDiff } from "../gameStateDiff.js";
import { ChunkMesh } from "./chunkMesh.js";
import { CameraRay } from "../index.js";


export interface ISerializedWorld {
  chunks: ISerializedChunk[];
  // tg: ISerializedTerrainGenerator;
}

export class ChunkHolder {
  private chunks = new Map<string, Chunk>();

  constructor(
    public wasmWorld: WorldModuleTypes.World,
  ) {}

  setAll(chunks: Chunk[]): void {
    this.chunks = new Map(chunks.map(c => [c.pos.toIndex(), c]));
    console.log("Setting all");
    chunks.forEach(c => this.wasmWorld.insert_chunk_wasm(c.serialize()));
  }

  addOrUpdate(chunk: Chunk): void {
    console.log("Setting chunk", chunk);
    this.chunks.set(chunk.pos.toIndex(), chunk);
    const serialized = chunk.serialize();
    this.wasmWorld.insert_chunk_wasm(serialized);
  }

  has(pos: Vector2D): boolean {
    return this.wasmWorld.has_chunk_wasm(pos.toCartIntObj())
  }

  get(pos: Vector2D): Chunk | null {
    return this.chunks.get(pos.toIndex()) ?? null;
  }

  getAll(): Chunk[] {
    return Array.from(this.chunks.values());
  }
}
export class World {
  // public terrainGenerator: TerrainGenerator;
  private chunks = new ChunkHolder(this.wasmWorld);
  public loadingChunks = new Set<string>();

  static async make(
    chunkReader: IChunkReader,
    data?: ISerializedWorld
  ): Promise<World> {
    console.log("Loading world")
    await WorldModule.load();
    const wasmWorld = WorldModule.module.World.new_wasm();
    const world = new World(wasmWorld, chunkReader, data);
    await world.load();
    console.log("World loaded")
    return world;
  }

  constructor(
    public wasmWorld: WorldModuleTypes.World,
    private chunkReader: IChunkReader,
    data?: ISerializedWorld
  ) {
    console.log("wasm world", this.wasmWorld);

    if (data) {
      // this.terrainGenerator = new TerrainGenerator(this.hasChunk.bind(this), this.getChunkFromPos.bind(this), data.tg);
      this.chunks.setAll(data.chunks.map(ser => {
        const chunkPos = new Vector2D([ser.position.x, ser.position.y]);
        const wasmChunk = WorldModule.module.Chunk.deserialize(ser);
        return new Chunk(wasmChunk, chunkPos);
      }));
    } else {
      // this.terrainGenerator = new TerrainGenerator(this.hasChunk.bind(this), this.getChunkFromPos.bind(this));
    }
  }

  // We just aren't going to serialize the terrain generator for now. Hopefully later we find a better way to do this
  serialize(): ISerializedWorld {
    // const serializedTG = this.terrainGenerator.serialize();
    const serializedChunks = this.chunks.getAll().map((chunk) =>
      chunk.serialize()
    );
    return {
      chunks: serializedChunks,
      // tg: serializedTG,
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

  getChunkFromPos(chunkPos: Vector2D, config?: { loadIfNotFound?: boolean }) {
    const chunk = this.chunks.get(chunkPos);
    if (!chunk && config?.loadIfNotFound) this.loadChunk(chunkPos);
    // if (!chunk && config?.generateIfNotFound) return this.generateChunk(chunkPos);
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
    const wasmMesh: Array<[WasmCube, {data: Array<boolean>}]> = this.wasmWorld.get_chunk_mesh_wasm(chunkPos.toCartIntObj());

    const betterMesh = wasmMesh.map(([cube, {data}]) => {
      const block = CubeHelpers.fromWasmCube(cube);
      const faces = data.map((b, i) => b ? i : -1).filter(i => i !== -1) as Direction[];
      return {
        block,
        faces,
      }
    });

    console.log("Got chunk mesh for ", chunkPos, betterMesh);

    return new ChunkMesh(betterMesh, chunkPos.toCartIntObj());
  }

  getBlockFromWorldPoint(pos: Vector3D): Cube | null {
    const wasmBlock: ISerializedCube = this.wasmWorld.get_block_wasm(pos.toCartIntObj());
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
    const loadPromises: Promise<void>[] = [];
    console.log("Loading")

    if (!CONFIG.terrain.generateChunks) {
      return;
    }

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

  async loadChunk(chunkPos: Vector2D): Promise<void> {
    // no repeat loading
    if (this.loadingChunks.has(chunkPos.toIndex())) {
      return;
    }

    this.loadingChunks.add(chunkPos.toIndex());
    console.log("Calling load chunk")
    const chunk = await this.chunkReader.getChunk(chunkPos.toIndex());
    // this should only happen on the client side when single player
    // and on the server side when multiplayer
    // if (!chunk) chunk = this.terrainGenerator.generateChunk(chunkPos);
    console.log("Got chunk", chunk)
    this.addOrUpdateChunk(chunk);
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
          for (const vec of [...Vector3D.unitVectors, ...Vector3D.edgeVectors, ...Vector3D.cornerVectors]) {
            const checkingPos = center.add(vec);
            ifCubeExistThenPushOut(checkingPos);
          }
        }
      }
    }
  }

  async addBlock(stateDiff: GameStateDiff, cube: Cube, options?: {loadChunkIfNotLoaded: boolean}) {
    const chunk = this.getChunkFromWorldPoint(cube.pos);
    if (!chunk) {
      if (options?.loadChunkIfNotLoaded) {
        await this.loadChunk(World.worldPosToChunkPos(cube.pos));
      } else {
        throw new Error("Trying to place block in unloaded chunk");
      }
    }
    const diff: {chunk_ids: string[]} = this.wasmWorld.add_block_wasm({
      block_type: cube.type,
      extra_data: "None",
      world_pos: {
        x: cube.pos.get(0),
        y: cube.pos.get(1),
        z: cube.pos.get(2),
      },
    });

    diff.chunk_ids.forEach(id => stateDiff.updateChunk(id));
  }

  removeBlock(stateDiff: GameStateDiff, cubePos: Vector3D) {
    console.log("Removing block", cubePos);
    const chunk = this.getChunkFromWorldPoint(cubePos);
    if (!chunk) return;
    const diff: {chunk_ids: string[]} =this.wasmWorld.remove_block_wasm(
      cubePos.get(0),
      cubePos.get(1),
      cubePos.get(2)
    );
    console.log("Diff from removing block", diff);
    diff.chunk_ids.forEach(id => stateDiff.updateChunk(id));
  }

  lookingAt(camera: CameraRay): ILookingAtData | null {
    const lookingData: {
      block: ISerializedCube,
      face: string,
      distance: number,
    } | null = this.wasmWorld.get_pointed_at_block_wasm(camera);


    console.log("Cam looking at ", lookingData, camera)


    if (!lookingData) return null;

    return {
      cube: CubeHelpers.fromWasmCube(lookingData.block),
      face: getDirectionFromString(lookingData.face),
      dist: lookingData.distance,
    }
  }
}
