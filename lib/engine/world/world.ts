import CubeHelpers, {
  Cube,
  ISerializedCube,
  WasmCube,
} from "../entities/cube.js";
import { ILookingAtData, ISerializedChunk } from "./chunk.js";
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
import { CameraRay, IChunkReader } from "../index.js";

type ISerializedChunkHolder = ISerializedChunk[];

// export class ChunkHolder {
//   private loadingChunks = new Map<string, Promise<Chunk>>();
//
//   constructor(
//     private wasmWorld: WorldModuleTypes.World,
//     private chunkReader: IChunkReader,
//     data?: ISerializedChunkHolder
//   ) {
//     if (data) {
//       data.forEach((ser) => {
//         this.addOrUpdate(ser);
//       });
//     }
//   }
//
//   has(pos: Vector2D): boolean {
//     return this.wasmWorld.has_chunk_wasm(pos.toCartIntObj());
//   }
//
//   get(pos: Vector2D): Chunk | null {
//     return this.chunks.get(pos.toIndex()) ?? null;
//   }
//
//   getAll(): Chunk[] {
//     return Array.from(this.chunks.values());
//   }
//
//   async loadAll(): Promise<Chunk[]> {
//     return Promise.all(this.loadingChunks.values());
//   }
//
//   startLoadingChunk(pos: Vector2D): void {
//     const chunkId = pos.toIndex();
//
//     if (this.chunks.has(chunkId)) {
//       return;
//     }
//
//     if (this.loadingChunks.has(chunkId)) {
//       return;
//     }
//
//     const chunkPromise = this.chunkReader.getChunk(chunkId);
//
//     const wrappedChunkPromise = chunkPromise
//       .then((chunk) => {
//         this.chunksToSend.push(chunk);
//         this.addOrUpdate(chunk);
//         this.loadingChunks.delete(chunkId);
//         return chunk;
//       })
//       .catch((err) => {
//         this.loadingChunks.delete(chunkId);
//         throw err;
//       });
//
//     this.loadingChunks.set(chunkId, wrappedChunkPromise);
//   }
//
//   getNewlyLoadedChunk(): Chunk | null {
//     return this.chunksToSend.shift() ?? null;
//   }
// }

export interface ISerializedWorld {
  chunks: ISerializedChunkHolder;
}

export class World {
  static async make(
    chunkReader: IChunkReader,
    data?: ISerializedWorld
  ): Promise<World> {
    const world = WorldModule.createWorld(chunkReader, data);
    await world.load();
    console.log("World loaded");
    return world;
  }

  private newlyLoadedChunks: string[] = [];

  constructor(
    public wasmWorld: WorldModuleTypes.World,
    private chunkReader: IChunkReader,
    data?: ISerializedWorld
  ) {
    if (data) {
      console.log("World: Loading world from data", data);
      data.chunks.forEach((ser) => {
        this.updateChunk(ser);
      });
    }
  }

  serialize(): ISerializedWorld {
    const ser = this.wasmWorld.serialize_wasm() as {
      chunks: Map<string, ISerializedChunk>;
    };
    console.log("Serializing world", ser);
    return {
      chunks: Array.from(ser.chunks.values()),
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

  getChunkFromPos(chunkPos: Vector2D): ISerializedChunk {
    const chunk = this.wasmWorld.get_chunk_from_chunk_pos_wasm({
      x: chunkPos.get(0),
      y: chunkPos.get(1),
    });
    return chunk;
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

  updateChunk(chunkData: ISerializedChunk) {
    const time = performance.now();
    console.log("Inserting chunk", chunkData);
    this.wasmWorld.insert_chunk_wasm(chunkData);
    const time2 = performance.now();
    console.log("Chunk inserted in", time2 - time, "ms");
  }

  hasChunk(chunkPos: Vector2D): boolean {
    return this.wasmWorld.is_chunk_loaded_wasm({
      x: chunkPos.get(0),
      y: chunkPos.get(1),
    });
  }

  // load the starting chunks
  // called before the world is passed on to the game
  private async load() {
    if (!CONFIG.terrain.generateChunks) {
      return;
    }
    const chunkIds = this.getChunkPosAroundPoint(new Vector3D([0, 0, 0]));
    const chunkPromises = chunkIds.map((c) => this.loadChunk(c));
    await Promise.all(chunkPromises);
  }

  async loadChunk(pos: Vector2D): Promise<ISerializedChunk | null> {
    if (this.hasChunk(pos)) {
      return null;
    }
    console.log("World: Loading chunk", pos.toIndex());
    const chunkId = pos.toIndex();
    const chunk = await this.chunkReader.getChunk(chunkId);
    this.updateChunk(chunk);
    this.newlyLoadedChunks.push(chunkId);
    return chunk;
  }

  getNewlyLoadedChunkId(): string | null {
    return this.newlyLoadedChunks.shift() ?? null;
  }

  getLoadedChunkIds(): string[] {
    const loaded_pos = this.wasmWorld.get_loaded_chunk_pos() as {
      x: number;
      y: number;
    }[];

    return loaded_pos
      .map((p: { x: number; y: number }) => {
        return new Vector2D([p.x, p.y]);
      })
      .map((p) => p.toIndex());
  }

  getChunkPosAroundPoint(pos: Vector3D): Vector2D[] {
    const centerChunkPos = World.worldPosToChunkPos(pos);

    const chunkIds = [];

    for (let i = -CONFIG.loadDistance; i < CONFIG.loadDistance; i++) {
      for (let j = -CONFIG.loadDistance; j < CONFIG.loadDistance; j++) {
        const chunkPos = new Vector2D([
          centerChunkPos.get(0) + i,
          centerChunkPos.get(1) + j,
        ]);
        chunkIds.push(chunkPos);
      }
    }

    return chunkIds;
  }

  tryMove(entity: Entity, vel: Vector3D): Vector3D {
    const endPos = {
      x: entity.pos.get(0) + vel.get(0),
      y: entity.pos.get(1) + vel.get(1),
      z: entity.pos.get(2) + vel.get(2),
    };
    const ent = {
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
    };
    const newPos = this.wasmWorld.move_rect3_wasm(ent, endPos);
    return new Vector3D([newPos.x, newPos.y, newPos.z]);
  }

  getIntersectingBlocksWithEntity(pos: Vector3D, dim: Vector3D): Vector3D[] {
    const worldPosList = this.wasmWorld.get_rect3_intersecting_blocks_wasm({
      pos: {
        x: pos.get(0),
        y: pos.get(1),
        z: pos.get(2),
      },
      dim: {
        x: dim.get(0),
        y: dim.get(1),
        z: dim.get(2),
      },
    });

    const vecs: Vector3D[] = worldPosList.map(
      (pos: { x: number; y: number; z: number }) =>
        new Vector3D([pos.x, pos.y, pos.z])
    );
    return vecs;
  }

  async addBlock(
    stateDiff: GameStateDiff,
    cube: Cube,
    options?: { loadChunkIfNotLoaded: boolean }
  ) {
    console.log("World: Adding block", cube);
    const hasChunk = this.hasChunk(World.worldPosToChunkPos(cube.pos));
    if (!hasChunk) {
      if (options?.loadChunkIfNotLoaded) {
        await this.loadChunk(World.worldPosToChunkPos(cube.pos));
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
    // chunk.addBlock(cube);

    console.log("Chunks to updated after adding block: ", diff);

    diff.chunk_ids.forEach((id) => stateDiff.updateChunk(id));
  }

  removeBlock(stateDiff: GameStateDiff, cubePos: Vector3D) {
    console.log("Removing block", cubePos);

    const diff: { chunk_ids: string[] } = this.wasmWorld.remove_block_wasm(
      cubePos.get(0),
      cubePos.get(1),
      cubePos.get(2)
    );

    // chunk.removeBlock(cubePos);

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
