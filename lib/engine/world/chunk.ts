import { Cube } from "../entities/cube.js";
import { CONFIG } from "../config.js";
import { Vector3D, Vector2D, Direction } from "../utils/vector.js";
import { BLOCKS, BlockType } from "../blockdata.js";
import { WorldModuleTypes } from "../modules.js";
export interface ILookingAtData {
  cube: Cube;
  face: Direction;
  dist: number;
}

export interface ISerializedChunk {
  position: {
    x: number;
    y: number;
  };
  blocks: BlockType[];
  block_data: ("None" | { Image: string })[];
  chunkId: string;
}

export type ISerializedVisibleFaces = Array<{
  world_pos: { x: 0; y: 0; z: 0 };
  faces: [boolean, boolean, boolean, boolean, boolean, boolean];
}>;

export class Chunk {
  uid: string;

  constructor(
    private wasmChunk: WorldModuleTypes.Chunk,
    public pos: Vector2D,
    data?: ISerializedChunk
  ) {
    this.uid = pos.toIndex();

    if (data) {
      this.set(data);
    }
  }

  serialize(): ISerializedChunk {
    const data = this.wasmChunk.serialize();

    return {
      chunkId: this.uid,
      block_data: data.block_data,
      blocks: data.blocks,
      position: data.position,
    } as ISerializedChunk;
  }

  set(data: ISerializedChunk) {
    this.wasmChunk.set(data);
  }

  addBlock(block: Cube) {
    const wasmBlock = {
      block_type: block.type,
      extra_data: "None",
      world_pos: {
        x: block.pos.get(0),
        y: block.pos.get(1),
        z: block.pos.get(2),
      },
    };
    this.wasmChunk.add_block_wasm(wasmBlock);
  }

  getBlockFromWorldPos(worldPos: Vector3D) {
    const scaleCoord = (coord: number) =>
      ((coord % CONFIG.terrain.chunkSize) + CONFIG.terrain.chunkSize) %
      CONFIG.terrain.chunkSize;

    const x = scaleCoord(worldPos.get(0));
    const y = worldPos.get(1);
    const z = scaleCoord(worldPos.get(2));

    const block = this.wasmChunk.get_block_wasm({
      x,
      y,
      z,
    }) as BLOCKS;

    return block;
  }

  /**
   * @param pos Is an inner chunk pos
   * @returns
   */
  getBlockData(pos: Vector3D) {
    const block = this.wasmChunk.get_block_wasm(pos.toCartIntObj()) as Cube;
    return block.extraData;
  }

  containsWorldPos(worldPos: Vector3D) {
    // scale cubes position by chunk size
    const scaledPos = worldPos.data.map((dim) =>
      Math.floor(dim / CONFIG.terrain.chunkSize)
    );
    return scaledPos[0] === this.pos.get(0) && scaledPos[2] === this.pos.get(1);
  }

  circleIntersect(circlePos: Vector3D, radius: number): boolean {
    const testCords = circlePos.copy();

    // find the closest faces to the circle and set the test cords to them
    for (let i = 0; i < 3; i++) {
      if (i === 1) continue; // only run for x and z
      if (circlePos.get(i) < this.pos.get(i)) {
        testCords.set(i, this.pos.get(i));
      } else if (
        circlePos.get(i) >
        this.pos.get(i) + CONFIG.terrain.chunkSize
      ) {
        testCords.set(i, this.pos.get(i) + CONFIG.terrain.chunkSize);
      }
    }

    const dist = testCords.distFrom(circlePos);

    return dist <= radius;
  }
}
