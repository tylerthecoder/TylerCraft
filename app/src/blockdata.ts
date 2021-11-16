
// namespace BlockData {




// }


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

export enum BlockType {
  cube = 0,
  x = 1,
  fluid = 2,
  flat = 3,
}

export interface IImageBlockData {
  galleryIndex: number;
  face: number;
}

export type ExtraBlockData = IImageBlockData;

interface BlockMetaData {
  gravitable: boolean;
  blockType: BlockType;
  transparent?: boolean;
  intangible?: boolean;
}

export const BLOCK_DATA: Map<BLOCKS, BlockMetaData> = new Map()

export function getBlockData(block: BLOCKS) {
  const data = BLOCK_DATA.get(block);
  if (!data) throw new Error("Block data not found");
  return data;
}

BLOCK_DATA.set(BLOCKS.grass, {
  gravitable: false,
  blockType: BlockType.cube,
});
BLOCK_DATA.set(BLOCKS.stone, {
  gravitable: false,
  blockType: BlockType.cube,
});
BLOCK_DATA.set(BLOCKS.wood, {
  gravitable: false,
  blockType: BlockType.cube,
});
BLOCK_DATA.set(BLOCKS.leaf, {
  gravitable: false,
  blockType: BlockType.cube,
  transparent: true,
});
BLOCK_DATA.set(BLOCKS.cloud, {
  gravitable: false,
  blockType: BlockType.cube,
});
BLOCK_DATA.set(BLOCKS.gold, {
  gravitable: false,
  blockType: BlockType.cube,
});
BLOCK_DATA.set(BLOCKS.redFlower, {
  gravitable: false,
  blockType: BlockType.x,
  transparent: true,
  intangible: true,
});
BLOCK_DATA.set(BLOCKS.water, {
  gravitable: false,
  blockType: BlockType.fluid,
  transparent: true,
  intangible: true,
});
BLOCK_DATA.set(BLOCKS.image, {
  gravitable: false,
  blockType: BlockType.flat,
});
