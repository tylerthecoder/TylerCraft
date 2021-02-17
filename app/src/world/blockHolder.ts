import { ChangeEvent } from "mongodb";
import { BLOCKS } from "../blockdata";
import { Cube } from "../entities/cube";
import { deserializeCube, ISerializedCube, serializeCube } from "../serializer";
import { Vector2D, Vector3D } from "../utils/vector";
import { Chunk } from "./chunk";

export type ISerializedBlockerHolder = ISerializedCube[]

export class BlockHolder {
  // private blocks: Map<string, Cube> = new Map();

  private blocks: Array<Array<Uint8Array>>;

  constructor(
    private chunk: Chunk
  ) {
    this.blocks = [];
    for (let i = 0; i < 16; i++) {
      this.blocks[i] = [];
      for (let j = 0; j < 64; j++) {
        this.blocks[i][j] = new Uint8Array(new ArrayBuffer(16));
        for (let k = 0; k < 16; k++) {
          this.blocks[i][j][k] = BLOCKS.void;
        }
      }
    }
  }

  static isInBounds(pos: Vector3D) {
    return !(pos.get(0) >= 16 || pos.get(0) < 0 || pos.get(1) >= 64 || pos.get(1) < 0 || pos.get(2) >= 16 || pos.get(2) < 0)
  }



  // serialize(): ISerializedBlockerHolder {
  //   const blockData: ISerializedCube[] = [];
  //   for (const [pos, cube] of this.blocks.entries()) {
  //     blockData.push(serializeCube(cube, pos));
  //   }
  //   return blockData;
  // }

  // static deserialize(blockData: ISerializedBlockerHolder): BlockHolder {
  //   const blockHolder = new BlockHolder();

  //   blockHolder.blocks = new Map(
  //     blockData.map(data => {
  //       return [
  //         data[0],
  //         deserializeCube(data)
  //       ];
  //     })
  //   );

  //   return blockHolder;
  // }


  convertWorldPosToRelativePos(worldPos: Vector3D): Vector3D {
    // const x = worldPos.get(0);
    const adjustedX = ((worldPos.get(0) % 16) + 16) % 16;
    const adjustedZ = ((worldPos.get(2) % 16) + 16) % 16;
    return new Vector3D([adjustedX, worldPos.get(1), adjustedZ]);
  }

  get(worldPos: Vector3D): Cube | null {
    if (!this.chunk.containsWorldPos(worldPos)) return null; // DEV ONLY
    const relPos = this.convertWorldPosToRelativePos(worldPos);
    try {
      const block = this.blocks[relPos.get(0)][relPos.get(1)][relPos.get(2)];
      if (block === undefined || block === BLOCKS.void) return null;
      return new Cube(block, worldPos);
    } catch {
      return null;
    }
  }

  add(cube: Cube): void {
    const relPos = this.convertWorldPosToRelativePos(cube.pos);

    if (this.has(cube.pos)) {
      // console.log("Overriding cubes");
    }

    this.blocks[relPos.get(0)][relPos.get(1)][relPos.get(2)] = cube.type;
  }

  remove(worldPos: Vector3D): void {
    const relPos = this.convertWorldPosToRelativePos(worldPos);
    this.blocks[relPos.get(0)][relPos.get(1)][relPos.get(2)] = BLOCKS.void;
  }

  iterate(predicate: (cube: Cube) => void): void {
    this.blocks.forEach((arr, i) => arr.forEach((arr2, j) => {
      arr2.forEach((blockType, k) => {
        if (blockType === BLOCKS.void) return; // remove air
        const translated = this.chunk.pos.add(new Vector3D([i, j, k]));
        const cube = new Cube(blockType, translated);
        predicate(cube);
      });
    }));
  }

  has(worldPos: Vector3D): boolean {
    // check that this world pos is in thi
    const relPos = this.convertWorldPosToRelativePos(worldPos);
    return this.blocks[relPos.get(0)][relPos.get(1)][relPos.get(2)] !== BLOCKS.void;
  }
}