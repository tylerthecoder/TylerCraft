
export enum BLOCKS {
  grass = 0,
  stone = 1,
  wood = 2,
  leaf = 3,
  cloud = 4,
  gold = 5,
  redFlower = 6,
}

export enum BlockType {
  cube = 0,
  x = 1,
}

interface BlockData {
  gravitable: boolean;
  blockType: BlockType;
  transparent?: boolean;
}

export const BLOCK_DATA: Map<BLOCKS, BlockData> = new Map( )
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
});
