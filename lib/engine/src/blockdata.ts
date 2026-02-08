import { BlockMetaData, BlockType } from "@craft/rust-world";

const cache = new Map<BlockType, BlockMetaData>();

export function getBlockData(block: BlockType) {
  if (cache.has(block)) return cache.get(block)!;
  const data = BlockMetaData.get_for_type_wasm(block);
  if (!data) throw new Error("Block data not found for " + block);
  cache.set(block, data);
  return data;
}
