import { BLOCKS } from "../src/blockdata";
import { Entity } from "../src/entities/entity";
import { Player } from "../src/entities/player";

const TEXTURE_ATLAS_WIDTH = 3;
const TEXTURE_ATLAS_HEIGHT = 3;

const xStepVal = 1 / TEXTURE_ATLAS_WIDTH;
const yStepVal = 1 / TEXTURE_ATLAS_HEIGHT;

const textureData = new Map<BLOCKS, {offsetX: number, offsetY: number}>();
textureData.set(BLOCKS.grass, {offsetX: 0, offsetY: 0});
textureData.set(BLOCKS.stone, {offsetX: 1, offsetY: 0});
textureData.set(BLOCKS.wood, {offsetX: 0, offsetY: 1});
textureData.set(BLOCKS.leaf, {offsetX: 1, offsetY: 1});
textureData.set(BLOCKS.cloud, {offsetX: 2, offsetY: 0});
textureData.set(BLOCKS.gold, {offsetX: 2, offsetY: 1});
textureData.set(BLOCKS.redFlower, {offsetX: 0, offsetY: 2});
textureData.set(BLOCKS.water, {offsetX: 2, offsetY: 2});

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

  getBlockPreviewCords(type: BLOCKS, width: number, height: number) {
    const {offsetX, offsetY} = textureData.get(type);

    const x = offsetX * xStepVal * width;
    const y = offsetY * yStepVal * height;
    const w = xStepVal * width;
    const h = yStepVal * height;

    return { x, y, w, h }
  }

  getTextureCordsEntity(ent: Entity) {
    // if (ent instanceof Player) {

      // top and bottom face face
      let startYVal = yStepVal * 2.5;
      let endYVal = yStepVal * 3;
      let startXVal = 0;
      let endXVal = xStepVal;

      const top = [
        startXVal, startYVal,
        startXVal, endYVal,
        endXVal / 2, endYVal,
        endXVal / 2, startYVal,
      ];


      const bottom = [
        endXVal /2, startYVal,
        endXVal /2, endYVal,
        endXVal, endYVal,
        endXVal, startYVal
      ]

      // front faces

      startXVal = xStepVal;
      startYVal = yStepVal * 2;
      let midXVal = xStepVal * 1.5;
      endXVal = xStepVal * 2;
      endYVal = yStepVal * 3;

      const front = [
        midXVal, endYVal,
        midXVal, startYVal,
        startXVal, startYVal,
        startXVal, endYVal,
      ]

      const back = [
        endXVal, endYVal,
        endXVal, startYVal,
        midXVal, startYVal,
        midXVal, endYVal,
      ]

      const other = [
        midXVal, endYVal,
        endXVal, endYVal,
        endXVal, startYVal,
        midXVal, startYVal,
      ]

      return [
        front,
        back,
        top,
        bottom,
        other,
        other,
      ]
    // }
  }
}

const TextureMapper = new Textures();

export default TextureMapper;