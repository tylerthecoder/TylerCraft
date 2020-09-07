
interface BlockData {
  gravitable: boolean;
}

export enum BLOCKS {
  grass = 0,
  stone = 1,
  wood = 2,
  leaf = 3,
  cloud = 4,
  gold = 5,
}

export const BLOCK_DATA: Map<BLOCKS, BlockData> = new Map( )
BLOCK_DATA.set(BLOCKS.grass, {
  gravitable: false,
});
BLOCK_DATA.set(BLOCKS.stone, {
  gravitable: false,
});
BLOCK_DATA.set(BLOCKS.wood, {
  gravitable: false,
});
BLOCK_DATA.set(BLOCKS.leaf, {
  gravitable: false,
});
BLOCK_DATA.set(BLOCKS.cloud, {
  gravitable: false,
});
BLOCK_DATA.set(BLOCKS.gold, {
  gravitable: false,
});

