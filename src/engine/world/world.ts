import CubeHelpers, { Cube, CUBE_DIM, ISerializedCube } from "../entities/cube.js";
import { Chunk, ILookingAtData, ISerializedChunk } from "./chunk.js";
import { Entity } from "../entities/entity.js";
import { IChunkReader } from "../types.js";
import { CONFIG } from "../config.js";
import { Vector3D, Vector2D } from "../utils/vector.js";
import WorldModule, { WorldModuleTypes } from "../modules.js";
import { BLOCK_DATA } from "../blockdata.js";
import { ICameraData } from "../camera.js";
import { GameStateDiff } from "../gameStateDiff.js";


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
    chunks.forEach(c => this.wasmWorld.set_chunk_at_pos(c.serialize()));
  }

  addOrUpdate(chunk: Chunk): void {
    console.log("Setting chunk at", chunk);
    this.chunks.set(chunk.pos.toIndex(), chunk);
    const serialized = chunk.serialize();
    this.wasmWorld.set_chunk_at_pos(serialized);
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

  // getChunkMesh(chunkPos: Vector2D): ChunkMesh {
    // TODO:
    // ask wasm for the chunk mesh.
  // }

  getChunkFromWorldPoint(pos: Vector3D) {
    const chunkPos = World.worldPosToChunkPos(pos);
    return this.getChunkFromPos(chunkPos);
  }

  getBlockFromWorldPoint(pos: Vector3D): Cube | null {
    // I think the error comes from calculating visible faces
    // For some reason the block that we get back is not from thee correct chunk

    if (!this.wasmWorld.is_block_loaded_wasm(pos.toCartIntObj())) {
      throw new Error("Getting block that hasn't been loaded")
    }

    const wasmBlock: ISerializedCube = this.wasmWorld.get_block_wasm(pos.toCartIntObj());


    const block: Cube = {
      pos: new Vector3D([wasmBlock.world_pos.x, wasmBlock.world_pos.y, wasmBlock.world_pos.z]),
      type: wasmBlock.block_type,
      // We aren't passing on extra block data just quite yet
      // extraData: wasmBlock.extra_data === "None" ? ,
    }

    if (block === null) {
      return null;
    }

    return block;
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
    return new Promise((resolve) => {
      this.chunkReader.getChunk(chunkPos.toIndex()).then((chunk) => {
        // this should only happen on the client side when single player
        // and on the server side when multiplayer
        // if (!chunk) chunk = this.terrainGenerator.generateChunk(chunkPos);
        this.addOrUpdateChunk(chunk);
        resolve();
      });
    });
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
  // Only "loaded" chunks should be doing this
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

  addBlock(stateDiff: GameStateDiff, cube: Cube) {
    const chunk = this.getChunkFromWorldPoint(cube.pos);
    if (!chunk) {
      throw new Error("Trying to place block in unloaded chunk");
    }
    const diff: {chunk_ids: string[]} = this.wasmWorld.add_block_wasm({
      block_type: cube.type,
      extra_data: cube.extraData,
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
    diff.chunk_ids.forEach(id => stateDiff.updateChunk(id));
  }

  lookingAt(camera: ICameraData): ILookingAtData | null {
    return null;
  }
}
