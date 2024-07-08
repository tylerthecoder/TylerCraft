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
import { ChunkMesh } from "./chunkMesh.js";
import { CameraRay } from "../index.js";

type ISerializedChunkHolder = ISerializedChunk[];

export interface ISerializedWorld {
  chunks: ISerializedChunkHolder;
}

export class World {
  static make(data?: ISerializedWorld): World {
    return WorldModule.createWorld(data);
  }

  constructor(
    public wasmWorld: WorldModuleTypes.World,
    data?: ISerializedWorld
  ) {
    if (data) {
      console.log("World: Loading world from data", data);
      for (const chunkData of data.chunks) {
        this.updateChunk(chunkData);
      }
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

  getChunkFromPos(chunkPos: Vector2D): ISerializedChunk {
    console.log("Getting chunk from pos", chunkPos);
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
    this.wasmWorld.insert_chunk_wasm(chunkData);
    const time2 = performance.now();
    console.log(`Upserting chunk took (${time2 - time}ms)`);
  }

  hasChunk(chunkPos: Vector2D): boolean {
    try {
      return this.wasmWorld.is_chunk_loaded_wasm({
        x: chunkPos.get(0),
        y: chunkPos.get(1),
      });
    } catch (e) {
      console.error("Error in hasChunk", chunkPos, e);
      throw e;
    }
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

  /**
   * @returns array of chunk ids that were affected
   * */
  addBlock(cube: Cube): string[] {
    // console.log("World: Adding block", cube);
    const hasChunk = this.hasChunk(World.worldPosToChunkPos(cube.pos));
    if (!hasChunk) {
      throw new Error("Trying to place block in unloaded chunk");
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
    // console.log("Chunks to updated after adding block: ", diff);
    return diff.chunk_ids;
  }

  /**
   * @returns array of chunk ids that were affected
   * */
  removeBlock(cubePos: Vector3D): string[] {
    // console.log("Removing block", cubePos);
    const diff: { chunk_ids: string[] } = this.wasmWorld.remove_block_wasm(
      cubePos.get(0),
      cubePos.get(1),
      cubePos.get(2)
    );
    // console.log("Chunks to updated after removing block: ", diff);
    return diff.chunk_ids;
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
