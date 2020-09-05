import { Renderer } from "./renderer";
import { canvas } from "../canvas";
import { Camera } from "../cameras/camera";
import { Chunk, ICubeFace } from "../../src/world/chunk";
import { arrayMul, arrayAdd, arraySub } from "../../src/utils";
import TextureMapper from "../textureMapper";
import { Cube } from "../../src/entities/cube";
import { Vector3D, Vector } from "../../src/utils/vector";

export class ChunkRenderer extends Renderer {
  constructor(public chunk: Chunk) {
    super();
    this.setActiveTexture(canvas.textures.textureAtlas);
    this.getBufferData();
  }

  render(camera: Camera) {
    // this.form.render(this.pos, screenPos, screenRot);
    this.renderObject(this.chunk.pos, camera);
  }

  getBufferData() {
    // build the cube map

    const visibleCubeFaces: ICubeFace[]= [];

    const cubeMap: Map<string, Cube> = new Map();
    for (const cube of this.chunk.getCubesItterable()) {
      cubeMap.set(`${cube.pos[0]},${cube.pos[1]},${cube.pos[2]}`, cube);
    }

    const getCube = (pos: Vector3D): Cube => {
      const cube = cubeMap.get(pos.toString());
      if (!cube) return null;
      return cube;
    }

    const positions = []; // used to store positions of vertices
    const indices = []; // used to store pointers to those vertices
    const textureCords = [];
    let offset = 0;
    for (const cube of this.chunk.getCubesItterable()) {
      const cubePosVector = new Vector3D(cube.pos);

      const texturePos = TextureMapper.getTextureCords(cube.type);
      // get position of cube relative to the chunk
      const relativePos = arraySub(cube.pos, this.chunk.pos);

      // loop through all the faces to get their cords
      let count = 0;
      for (const face of [0, 1, 2, 3, 4, 5]) {
        // check to see if there is a cube touching me on this face
        const directionVector = Vector.unitVectors3D[face];
        const nearbyCube = getCube(cubePosVector.add(directionVector));

        // skkkkkip
        if (nearbyCube) {
          continue;
        }

        // add the face to the list of visibile faces on the chunk
        visibleCubeFaces.push({
          directionVector,
          cube,
        });

        // get the dimension of the face i.e. x, y, z
        const dim = face >> 1;

        // get the direction of the face. In or out
        const dir = face % 2 === 0 ? 1 : 0;

        // four corners of a square, centered at origin
        const square = [[0, 0], [1, 0], [1, 1], [0, 1]];

        // get a flattened array of the positions
        const vertices = square
          .map(edge => {
            // add the 3 dimension to the square
            edge.splice(dim, 0, dir);

            const size = cube.dim;

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

      offset += count;
    }

    this.chunk.visibleFaces = visibleCubeFaces;

    this.setBuffers(positions, indices, textureCords);
  }
}
