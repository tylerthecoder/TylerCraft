import { BLOCKS } from "../src/blockdata";

const TEXTURE_ATLAS_WIDTH = 3;
const TEXTURE_ATLAS_HEIGHT = 2;

const xStepVal = 1 / TEXTURE_ATLAS_WIDTH;
const yStepVal = 1 / TEXTURE_ATLAS_HEIGHT;

const textureData = new Map<BLOCKS, {offsetX: number, offsetY: number}>();
textureData.set(BLOCKS.grass, {offsetX: 0, offsetY: 0});
textureData.set(BLOCKS.stone, {offsetX: 1, offsetY: 0});
textureData.set(BLOCKS.wood, {offsetX: 0, offsetY: 1});
textureData.set(BLOCKS.leaf, {offsetX: 1, offsetY: 1});
textureData.set(BLOCKS.cloud, {offsetX: 2, offsetY: 0});
textureData.set(BLOCKS.gold, {offsetX: 2, offsetY: 1});

class Textures {
  getTextureCords(type: BLOCKS) {
    const {offsetX, offsetY} = textureData.get(type);


    const startX = offsetX * xStepVal;
    const midX = startX + xStepVal/2;
    const endX = startX + xStepVal

    const startY = offsetY * yStepVal;
    const midY = startY + yStepVal/2;
    const endY = startY + yStepVal;

    return [
      [midX, midY, midX, startY, startX, startY, startX, midY ], // front
      [midX, midY, midX, startY, startX, startY, startX, midY ], // back
      [midX, startY, midX, midY, endX, midY, endX, startY], // top
      [midX, endY, midX, midY, startX, midY, startX, endY], // bottom
      [midX, endY, endX, endY, endX, midY, midX, midY], // right
      [startX, midY, midX, midY, midX, startY, startX, startY], // left
    ]
  }
}

const TextureMapper = new Textures();

export default TextureMapper;