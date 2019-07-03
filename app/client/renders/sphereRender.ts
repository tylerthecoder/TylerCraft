import { Renderer } from "./renderer";
import { canvas } from "../canvas";
import { Camera } from "../cameras/camera";
import { Entity } from "../../src/entities/entity";

export class SphereRenderer extends Renderer {
  radius = 1;

  constructor(public entity: Entity) {
    super();

    this.setActiveTexture(canvas.textures.checker);
    this.setup();
  }

  render(camera: Camera) {
    this.renderObject(this.entity.pos, camera);
  }

  setup() {
    const layers = 9;

    const positions: number[][] = [];
    const indices: number[][] = [];

    let startPtr = 0;

    for (let layer = 0; layer < layers; layer++) {
      const y = -Math.cos((layer / (layers - 1)) * Math.PI);
      const circleRadius = Math.sqrt(1 - y ** 2);
      const layerAmount =
        layer * 2 < layers ? (layer + 1) ** 2 : (layers - layer) ** 2;

      const middlePtr = positions.length;

      for (let j = 0; j < layerAmount; j++) {
        const x = Math.cos(j * ((2 * Math.PI) / layerAmount)) * circleRadius;
        const z = Math.sin(j * ((2 * Math.PI) / layerAmount)) * circleRadius;
        const pos = [x, y, z].map(o => (o * this.radius) / 2);
        positions.push(pos);
      }

      const endPtr = positions.length;

      const oldLength = middlePtr - startPtr;
      const newLength = endPtr - middlePtr;

      // check if in-between p1 and p2
      const between2 = (p1: number, p2: number, length: number) => {
        const res = [];
        if (length === 1) return [0];
        for (let i = 0; i < length; i++) {
          const percent = i / length;
          if (percent >= p1) {
            if (p1 < p2) {
              if (percent < p2) {
                res.push(i);
              }
            } else {
              res.push(i);
            }
          }
        }

        if (p1 > p2) {
          for (let i = 0; i < length; i++) {
            const percent = i / length;
            if (percent <= p2) {
              res.push(i);
            }
          }
        }

        return res;
      };

      const addTriangles = (
        fromStart: number,
        fromLength: number,
        toStart: number,
        toLength: number
      ) => {
        for (let i = 0; i < fromLength; i++) {
          const p1 = i;
          const p2 = (i + 1) % fromLength;

          const bet = between2(p1 / fromLength, p2 / fromLength, toLength).map(
            x => x + toStart
          );

          const halfway = Math.floor(bet.length / 2);

          for (let j = 0; j < bet.length; j++) {
            const indexPoint = bet[j];
            if (j === halfway) {
              const in1 = p1 + fromStart;
              const in2 = p2 + fromStart;
              const in3 = indexPoint;
              const tri = [in1, in2, in3];
              indices.push(tri);
            } else if (j < halfway) {
              const in1 = p1 + fromStart;
              const in2 =
                indexPoint + 1 > toStart + toLength - 1
                  ? toStart
                  : indexPoint + 1;
              const tri = [in1, indexPoint, in2];
              indices.push(tri);
            } else {
              const in1 = p2 + fromStart;
              const in2 =
                indexPoint - 1 < toStart
                  ? toStart + toLength - 1
                  : indexPoint - 1;
              const tri = [in1, indexPoint, in2];
              indices.push(tri);
            }
          }
        }
      };

      // only add indices if you are in the middle of the layers
      if (layer !== layers - 1) {
        addTriangles(middlePtr, newLength, startPtr, oldLength);
      }

      if (layer !== 0) {
        addTriangles(startPtr, oldLength, middlePtr, newLength);
      }

      startPtr = middlePtr;
    }

    const textureCords = [];
    for (let i = 0; i < 100; i++) {
      textureCords.push(0, 0, 0.5, 0.25);
    }

    this.setBuffers(positions.flat(), indices.flat(), textureCords);
  }
}
