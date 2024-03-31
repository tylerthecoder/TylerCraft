import { BlockMetaData, BlockType } from "@craft/rust-world";

<<<<<<< Updated upstream
export interface IImageBlockData {
  galleryIndex: number;
  face: number;
}

export type ExtraBlockData = IImageBlockData | undefined;

const cache = new Map<BlockType, BlockMetaData>();

export function getBlockData(block: BlockType) {
  if (cache.has(block)) return cache.get(block)!;
  console.log("Getting block data for", block);
  const data = BlockMetaData.get_for_type_wasm(BlockType.Water);
=======
export function getBlockData(block: BlockType): BlockMetaData {
  const data = BlockMetaData.get_for_type_wasm(block);
>>>>>>> Stashed changes
  if (!data) throw new Error("Block data not found for " + block);
  cache.set(block, data);
  return data;
}
