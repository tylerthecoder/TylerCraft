import { Cube } from "../entities/cube";
import { Renderer } from "../canvas/renderer";
import { canvas } from "../canvas/canvas";
import { Entity } from "../entities/entity";
import { Camera } from "../cameras/camera";
import { IDim } from "..";

export const CHUNK_SIZE = 5;

export class Chunk {
  cubes: Cube[] = [];
  renderer = new Renderer();

  constructor(public chunkPos: number[]) {
    this.renderer.setActiveTexture(canvas.textures.grassBlock);

    this.generate();
  }

  get pos() {
    return [this.chunkPos[0] * CHUNK_SIZE, 0, this.chunkPos[1] * CHUNK_SIZE];
  }

  // use seed later down the line
  generate() {
    for (let i = 0; i < CHUNK_SIZE; i++) {
      for (let j = 0; j < CHUNK_SIZE; j++) {
        const cubePos = [this.pos[0] + i, 0, this.pos[2] + j];
        const cube = new Cube(cubePos as IDim);
        this.cubes.push(cube);
      }
    }
    this.getBufferData();
  }

  // change this to chunks instead of cubes later
  isCollide(ent: Entity): Cube[] {
    const collide: Cube[] = [];
    for (const cube of this.cubes) {
      if (cube.isCollide(ent)) {
        collide.push(cube);
      }
    }
    return collide;
  }

  render(camera: Camera) {
    // this.form.render(this.pos, screenPos, screenRot);
    this.renderer.render(this.pos, camera);
  }

  getBufferData() {
    const texturePos = [
      [0.5, 0.5, 0.5, 0, 0, 0, 0, 0.5], // front
      [0.5, 0.5, 0.5, 0, 0, 0, 0, 0.5], // back
      [0.5, 0, 0.5, 0.5, 1, 0.5, 1, 0], // top
      [0.5, 1, 0.5, 0.5, 0, 0.5, 0, 1], // bottom
      [0.5, 1, 1, 1, 1, 0.5, 0.5, 0.5], // right
      [0, 0.5, 0.5, 0.5, 0.5, 0, 0, 0] // left
    ];

    const positions = []; // used to store positions of vertices
    const indices = []; // used to store pointers to those vertices
    const textureCords = [];
    const facesToRender = [0, 1, 2, 3, 4, 5]; // make this change soon
    let offset = 0;
    for (const cube of this.cubes) {
      // get position of cube relative to the chunk
      const relativePos = cube.pos.map((c, i) => c - this.pos[i]);

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
            const cords = edge.map((dim, i) => dim * size[i]);

            // move the vertices by the cube's relative position in the chunk
            const adjustedCords = cords.map((ord, i) => ord + relativePos[i]);

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

    this.renderer.setBuffers(positions, indices, textureCords);
  }
}
