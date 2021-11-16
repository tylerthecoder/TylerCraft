import { BLOCKS } from "../src/blockdata";

const TEXTURE_ATLAS_WIDTH = 3;
const TEXTURE_ATLAS_HEIGHT = 4;

const xStepVal = 1 / TEXTURE_ATLAS_WIDTH;
const yStepVal = 1 / TEXTURE_ATLAS_HEIGHT;

const textureData = new Map<BLOCKS, { offsetX: number, offsetY: number } | null>();
textureData.set(BLOCKS.grass, { offsetX: 0, offsetY: 0 });
textureData.set(BLOCKS.stone, { offsetX: 1, offsetY: 0 });
textureData.set(BLOCKS.wood, { offsetX: 0, offsetY: 1 });
textureData.set(BLOCKS.leaf, { offsetX: 1, offsetY: 1 });
textureData.set(BLOCKS.cloud, { offsetX: 2, offsetY: 0 });
textureData.set(BLOCKS.gold, { offsetX: 2, offsetY: 1 });
textureData.set(BLOCKS.redFlower, { offsetX: 0, offsetY: 2 });
textureData.set(BLOCKS.water, { offsetX: 2, offsetY: 2 });

class Textures {
  private getTextureData(type: BLOCKS) {
    const data = textureData.get(type);
    if (!data) throw new Error(`Texture data fro texture ${type} was not found`);
    return data;
  }


  public getTextureCords(type: BLOCKS) {
    const { offsetX, offsetY } = this.getTextureData(type);


    const startX = offsetX * xStepVal;
    const midX = startX + xStepVal / 2;
    const endX = startX + xStepVal

    const startY = offsetY * yStepVal;
    const midY = startY + yStepVal / 2;
    const endY = startY + yStepVal;

    return [
      [midX, midY, midX, startY, startX, startY, startX, midY], // front
      [midX, midY, midX, startY, startX, startY, startX, midY], // back
      [midX, startY, midX, midY, endX, midY, endX, startY], // top
      [midX, endY, midX, midY, startX, midY, startX, endY], // bottom
      [midX, endY, endX, endY, endX, midY, midX, midY], // right
      [startX, midY, midX, midY, midX, startY, startX, startY], // left
    ]
  }

  public getBlockPreviewCords(type: BLOCKS, width: number, height: number) {
    const { offsetX, offsetY } = textureData.get(type)!;

    return {
      offset: {
        x: offsetX,
        y: offsetY,
      },
      cords: {
        x1: offsetX * xStepVal * width,
        x2: offsetX * (xStepVal + .5) * width,
        y1: offsetY * yStepVal * height,
        y2: offsetY * (yStepVal + .5) * height,
      }

    }
  }

  private getRect(startX: number, startY: number, endX: number, endY: number) {
    startX = startX * xStepVal;
    startY = startY * yStepVal;
    endX = endX * xStepVal;
    endY = endY * yStepVal;

    return [
      startX, startY,
      startX, endY,
      endX, endY,
      endX, startY,
    ]
  }

  private rotateRect(rect: number[], times: number) {
    rect = [...rect];
    for (let i = 0; i < times; i++) {
      const x = rect[0];
      const y = rect[1];
      rect.push(x, y);
      rect.shift();
      rect.shift();
    }
    return rect;
  }

  getPlayerTextureCoords() {
    // head
    const getHeadCords = () => {
      const front = this.rotateRect(this.getRect(0, 3, .5, 3.5), 2);
      const top = this.getRect(0, 3.5, .5, 4);
      const side = this.getRect(.5, 3, 1, 3.5);
      const bottom = this.getRect(1.5, 3.5, 2, 4);

      return [
        ...this.rotateRect(side, 2),
        ...front,
        ...top,
        ...bottom,
        ...this.rotateRect(side, 1),
        ...this.rotateRect(side, 1),
      ];
    }

    // body
    const getBodyCords = () => {
      const front = this.rotateRect(this.getRect(1, 3, 1.5, 3.75), 2);
      const back = this.getRect(2.25, 3, 2.5, 3.5);
      const top = this.getRect(1, 3.75, 1.5, 3.875);
      const side = this.getRect(2, 3, 2.25, 3.5);

      return [
        ...back,
        ...front,
        ...top,
        ...top,
        ...side,
        ...side,
      ];
    }

    const makeArm = () => {
      const front = this.getRect(1.5, 3, 1.75, 3.5);
      const top = this.getRect(1.75, 3, 2, 3.25);
      const bottom = this.getRect(1.75, 3.25, 2, 3.5);

      return [
        ...this.rotateRect(front, 2),
        ...this.rotateRect(front, 2),
        ...top,
        ...bottom,
        ...this.rotateRect(front, 1),
        ...this.rotateRect(front, 1),
      ]
    }

    const makeLeg = () => {
      const front = this.getRect(.5, 3.5, .75, 4);
      const top = this.getRect(.75, 3.5, 1, 3.75);
      const bottom = this.getRect(.75, 3.75, 1, 4);

      return [
        ...this.rotateRect(front, 2),
        ...this.rotateRect(front, 2),
        ...top,
        ...bottom,
        ...this.rotateRect(front, 1),
        ...this.rotateRect(front, 1),
      ]
    }


    return [
      ...getHeadCords(),
      ...getBodyCords(),
      ...makeLeg(),
      ...makeLeg(),
      ...makeArm(),
      ...makeArm(),
    ]


  }

  getTextureCordsEntity() {
    // if (ent instanceof Player) {


    // top and bottom face face
    let startYVal = yStepVal * 2.5;
    let endYVal = yStepVal * 3;
    let startXVal = 0;
    let endXVal = xStepVal;

    // const top = [
    //   startXVal, startYVal,
    //   startXVal, endYVal,
    //   endXVal / 2, endYVal,
    //   endXVal / 2, startYVal,
    // ];

    const top = this.getRect(0, 2.5, .5, 3);
    const bottom = this.getRect(.5, 2.5, 1, 3);

    // front faces

    startXVal = xStepVal;
    startYVal = yStepVal * 2;
    const midXVal = xStepVal * 1.5;
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