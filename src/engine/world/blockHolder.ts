import { BLOCKS, ExtraBlockData } from "../blockdata";
import CubeHelpers, { Cube, CubeDto } from "../entities/cube";
import { Vector3D } from "../utils/vector";
import { Chunk } from "./chunk";
import * as Modules from "../modules";


export type ISerializedBlockerHolder = CubeDto[]

export class BlockHolder {

  private blocks: ReturnType<typeof Modules.World.Chunk.new>;

  private blockData: {
    [index: string]: ExtraBlockData
  } = {};

  constructor(
    private chunk: Chunk
  ) {
    this.blocks = Modules.World.Chunk.new();
  }

  serialize(): ISerializedBlockerHolder {
    const blockData: CubeDto[] = [];

    this.iterate(cube => {
      blockData.push(CubeHelpers.serialize(cube));
    });

    return blockData;
  }

  static deserialize(blockData: ISerializedBlockerHolder, chunk: Chunk): BlockHolder {
    const blockHolder = new BlockHolder(chunk);

    blockData.forEach(cube => {
      blockHolder.add(CubeHelpers.deserialize(cube));
    });

    return blockHolder;
  }

  private getChunkPos(pos: Vector3D) {
    const adjustedX = ((pos.get(0) % 16) + 16) % 16;
    const adjustedZ = ((pos.get(2) % 16) + 16) % 16;
    return [adjustedX, pos.get(1), adjustedZ];
  }

  get(worldPos: Vector3D): Cube | null {
    if (!this.chunk.containsWorldPos(worldPos)) return null; // DEV ONLY
    const pos = this.getChunkPos(worldPos);

    try {

      const block: BLOCKS = this.blocks.get_block(
        pos[0],
        pos[1],
        pos[2]
      );

      if (block === BLOCKS.void) return null;
      return CubeHelpers.createCube(block, worldPos);
    } catch (err) {
      console.warn("Couldn't get", pos)
      return null;
    }
  }

  getBlockData(worldPos: Vector3D) {
    return this.blockData[worldPos.toIndex()] ?? null;
  }

  add(cube: Cube): void {
    const pos = this.getChunkPos(cube.pos);

    try {
      this.blocks.add_block(
        pos[0],
        pos[1],
        pos[2],
        cube.type
      );
    } catch (err) {
      console.warn("Couldn't add", pos, cube.type)
    }
    if (cube.extraData) {
      this.blockData[cube.pos.toIndex()] = cube.extraData;
    }
  }

  remove(worldPos: Vector3D): void {
    const pos = this.getChunkPos(worldPos);
    this.blocks.remove_block(
      pos[0],
      pos[1],
      pos[2],
    );
  }

  iterate(predicate: (cube: Cube) => void): void {
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 64; y++) {
        for (let z = 0; z < 16; z++) {
          const block: BLOCKS = this.blocks.get_block(x, y, z);
          if (block === BLOCKS.void) continue;
          const worldPos = new Vector3D([x, y, z]).add(this.chunk.pos);
          const cube = CubeHelpers.createCube(block, worldPos);
          predicate(cube);
        }
      }
    }
  }

  has(worldPos: Vector3D): boolean {
    const block: BLOCKS = this.blocks.get_block(
      worldPos.get(0),
      worldPos.get(1),
      worldPos.get(2)
    );
    return block !== BLOCKS.void;
  }
}