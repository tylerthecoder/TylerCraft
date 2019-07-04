import { Renderer } from "./renderer";
import { canvas } from "../canvas";
import { Camera } from "../cameras/camera";
import { Entity } from "../../src/entities/entity";
import { arrayMul } from "../../src/utils";

export class CubeRenderer extends Renderer {
  constructor(public entity: Entity) {
    super();

    this.setActiveTexture(canvas.textures.player);

    this.setup();
  }

  render(camera: Camera) {
    this.renderObject(this.entity.pos, camera);
  }

  private setup() {
    const base = [0, 1, 2, 0, 2, 3];
    const facesToRender = [0, 1, 2, 3, 4, 5];
    const textureCords = [
      [0, 1, 0, 0, 1, 0, 1, 1], // front
      [0, 1, 0, 0, 1, 0, 1, 1], // back
      [0, 0, 1, 0, 1, 1, 0, 1], // top
      [0, 0, 1, 0, 1, 1, 0, 1], // bottom
      [1, 1, 0, 1, 0, 0, 1, 0], // right
      [1, 1, 0, 1, 0, 0, 1, 0] // left
    ].flat();

    const positions = [];
    const indices = [];
    let count = 0;
    for (const face of facesToRender) {
      const i = face >> 1;
      const dir = face % 2 === 0 ? 0.5 : -0.5;

      // const pos = this.getFace(i, dir, this.dim);
      const square = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
      const pos = square
        .map(edge => {
          edge.splice(i, 0, dir);
          return arrayMul(edge, this.entity.dim); //
        })
        .flat();

      const index = base.map(x => x + count);
      count += 4;

      positions.push(...pos);
      indices.push(...index);
    }

    this.setBuffers(positions, indices, textureCords);
  }
}
