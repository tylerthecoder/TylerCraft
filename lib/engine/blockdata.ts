export enum BLOCKS {
  void = 0,
  stone = 1,
  wood = 2,
  leaf = 3,
  cloud = 4,
  gold = 5,
  redFlower = 6,
  water = 7,
  grass = 8,
  image = 9,
}

export enum BlockShape {
  cube = 0,
  x = 1,
  flat = 2,
}

export interface IImageBlockData {
  galleryIndex: number;
  face: number;
}

export type ExtraBlockData = IImageBlockData | undefined;

export interface BlockMetaData {
  blockType: BlockShape;
  transparent?: boolean;
  intangible?: boolean;
}

const BLOCK_DATA: Map<BLOCKS, BlockMetaData> = new Map();

export function getBlockData(block: BLOCKS) {
  const data = BLOCK_DATA.get(block);
  if (!data) throw new Error("Block data not found for " + block);
  return data;
}

BLOCK_DATA.set(BLOCKS.void, {
  blockType: BlockShape.cube,
  intangible: true,
});
BLOCK_DATA.set(BLOCKS.grass, {
  blockType: BlockShape.cube,
});
BLOCK_DATA.set(BLOCKS.stone, {
  blockType: BlockShape.cube,
});
BLOCK_DATA.set(BLOCKS.wood, {
  blockType: BlockShape.cube,
});
BLOCK_DATA.set(BLOCKS.leaf, {
  blockType: BlockShape.cube,
  transparent: true,
});
BLOCK_DATA.set(BLOCKS.cloud, {
  blockType: BlockShape.cube,
});
BLOCK_DATA.set(BLOCKS.gold, {
  blockType: BlockShape.cube,
});
BLOCK_DATA.set(BLOCKS.redFlower, {
  blockType: BlockShape.x,
  transparent: true,
  intangible: true,
});
BLOCK_DATA.set(BLOCKS.water, {
  blockType: BlockShape.cube,
  transparent: true,
  intangible: true,
});
BLOCK_DATA.set(BLOCKS.image, {
  blockType: BlockShape.flat,
});
