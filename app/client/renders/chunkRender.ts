import { Renderer } from "./renderer";
import { canvas } from "../canvas";
import { Camera } from "../cameras/camera";
import { Chunk } from "../../src/world/chunk";
import { arrayMul, arrayAdd, arraySub } from "../../src/utils";
import TextureMapper from "../textureMapper";

export class ChunkRenderer extends Renderer {
  constructor(public chunk: Chunk) {
    super();
    this.setActiveTexture(canvas.textures.grassBlock);
    this.getBufferData();
  }

  render(camera: Camera) {
    // this.form.render(this.pos, screenPos, screenRot);
    this.renderObject(this.chunk.pos, camera);
  }

  getBufferData() {

    const positions = []; // used to store positions of vertices
    const indices = []; // used to store pointers to those vertices
    const textureCords = [];
    const facesToRender = [0, 1, 2, 3, 4, 5]; // make this change soon
    let offset = 0;
    for (const cube of this.chunk.cubes) {
      const texturePos = TextureMapper.getTextureCords(cube.type);
      // get position of cube relative to the chunk
      const relativePos = arraySub(cube.pos, this.chunk.pos);

      // loop through all the faces to get their cords
      let count = 0;
      for (const face of facesToRender) {
        // get the dimension of the face i.e. x, y, z
        const dim = face >> 1;

        // get the direction of the face. In or out
        const dir = face % 2 === 0 ? 0.5 : -0.5;

        // four corners of a square, centered at origin
        const square = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];

        // get a flattened array of the positions
        const vertices = square
          .map(edge => {
            // add the 3 dimension to the square
            edge.splice(dim, 0, dir);

            // assume simple size for now
            const size = [1, 1, 1];

            // multiply edges by dimensions
            const cords = arrayMul(edge, size);

            // move the vertices by the cube's relative position in the chunk
            const adjustedCords = arrayAdd(cords, relativePos);

            return adjustedCords;
          })
          .flat();

        // get triangle indices
        const triIndices = [0, 1, 2, 0, 2, 3].map(x => x + count + offset);

        // increase the count
        count += 4;

        const textureCord = texturePos[face];

        positions.push(...vertices);
        indices.push(...triIndices);
        textureCords.push(...textureCord);
      }

      offset += 24;
    }

    this.setBuffers(positions, indices, textureCords);
  }
}
