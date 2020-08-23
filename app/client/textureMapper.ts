import { BLOCK_TYPES } from "../src/blockdata";

const TEXTURE_ATLAS_WIDTH = 2;
const TEXTURE_ATLAS_HEIGHT = 2;

const xStepVal = 1 / TEXTURE_ATLAS_WIDTH;
const yStepVal = 1 / TEXTURE_ATLAS_HEIGHT;

class Textures {

  textureData: {
    [texture in BLOCK_TYPES]: {
      offsetX: number,
      offsetY: number,
    }
  } = {
    grass: {
      offsetX: 0,
      offsetY: 0,
    },
    stone: {
      offsetX: 1,
      offsetY: 0,
    },
    wood: {
      offsetX: 0,
      offsetY: 1,
    },
    leaf: {
      offsetX: 1,
      offsetY: 1,
    }
  }

  getTextureCords(type: BLOCK_TYPES) {
    const {offsetX, offsetY} = this.textureData[type];


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