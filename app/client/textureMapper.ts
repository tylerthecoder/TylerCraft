import { BLOCK_TYPES } from "../src/blockdata";

const TEXTURE_ATLAS_WIDTH = 2;
const TEXTURE_ATLAS_HEIGHT = 1;

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
    }
  }

  getTextureCords(type: BLOCK_TYPES) {
    const {offsetX, offsetY} = this.textureData[type];

    const xStepVal = 1 / TEXTURE_ATLAS_WIDTH;
    const yStepVal = 1 / TEXTURE_ATLAS_HEIGHT;

    const startX = offsetX * xStepVal;
    const midX = startX + xStepVal/2;
    const endX = startX + xStepVal

    const startY = offsetY * yStepVal;
    const midY = startY + yStepVal/2;
    const endY = startY + yStepVal;

    return [
      [midX, midY, midX, startY, startX, startY, startX, midX ], // front
      [midX, midY, midX, startY, startX, startY, startX, midX ], // back
      [midX, startY, midX, midY, endX, midY, endX, startY], // top
      [midX, endY, midX, midY, startX, midY, startX, endY], // bottom
      [midX, endY, endX, endY, endX, midY, midX, midY], // right
      [startX, midY, midX, midY, midX, startY, startX, startY], // left
    ]
  }
}

const TextureMapper = new Textures();

export default TextureMapper;