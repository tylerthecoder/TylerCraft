import { BLOCKS, ExtraBlockData } from "../blockdata";
import CubeHelpers, { Cube, CubeDto } from "../entities/cube";
import { Vector3D } from "../utils/vector";
import { Chunk } from "./chunk";
import { Chunk as WasmChunk } from "@craft/world"


export type ISerializedBlockerHolder = CubeDto[]

export class BlockHolder {
  private blocks: Uint8Array;

  // Will have to check performance on this
  private blockData: {
    [index: number]: ExtraBlockData
  } = {};

  constructor(
    private chunk: Chunk
  ) {
    console.log(WasmChunk)
    const t = WasmChunk.new();
    this.blocks = new Uint8Array(new ArrayBuffer(16 * 64 * 16));
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

  private worldPosToIndex(pos: Vector3D) {
    const adjustedX = ((pos.get(0) % 16) + 16) % 16;
    const adjustedZ = ((pos.get(2) % 16) + 16) % 16;
    const part1 = adjustedX << (4 + 6);
    const part2 = pos.get(1) << 4;
    const part3 = adjustedZ;
    return part1 + part2 + part3;
  }

  private indexToWorldPos(index: number) {
    const part1 = index >> (4 + 6);
    const part2 = (index - (part1 << (4 + 6))) >> 4;
    const part3 = index - ((part1 << (4 + 6)) + (part2 << 4));
    return new Vector3D([part1, part2, part3])
      .add(this.chunk.pos);
  }

  get(worldPos: Vector3D): Cube | null {
    if (!this.chunk.containsWorldPos(worldPos)) return null; // DEV ONLY
    const index = this.worldPosToIndex(worldPos);
    const block = this.blocks[index];
    if (block === BLOCKS.void) return null;
    return CubeHelpers.createCube(block, worldPos);
  }

  getBlockData(worldPos: Vector3D) {
    const index = this.worldPosToIndex(worldPos);
    return this.blockData[index] ?? null;
  }

  add(cube: Cube): void {
    const index = this.worldPosToIndex(cube.pos);
    this.blocks[index] = cube.type;
    if (cube.extraData) {
      this.blockData[index] = cube.extraData;
    }
  }

  remove(worldPos: Vector3D): void {
    const index = this.worldPosToIndex(worldPos);
    this.blocks[index] = BLOCKS.void;
  }

  iterate(predicate: (cube: Cube) => void): void {
    this.blocks.forEach((blockType, index) => {
      if (blockType === BLOCKS.void) return;
      const blockPos = this.indexToWorldPos(index);
      const cube = CubeHelpers.createCube(blockType, blockPos);
      predicate(cube);
    });
  }

  iterate2(predicate: (cube: Cube, index: number) => void): void {
    this.blocks.forEach((blockType, index) => {
      if (blockType === BLOCKS.void) return;
      const blockPos = this.indexToWorldPos(index);
      const cube = CubeHelpers.createCube(blockType, blockPos);
      predicate(cube, index);
    });
  }

  has(worldPos: Vector3D): boolean {
    const index = this.worldPosToIndex(worldPos);
    return this.blocks[index] !== BLOCKS.void;
  }
}