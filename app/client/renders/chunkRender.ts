import { Renderer } from "./renderer";
import { canvas } from "../canvas";
import { Camera } from "../cameras/camera";
import { Chunk, ICubeFace } from "../../src/world/chunk";
import { arrayMul, arrayAdd, arraySub } from "../../src/utils";
import TextureMapper from "../textureMapper";
import { Cube } from "../../src/entities/cube";
import { Vector3D, Vector, Vector2D } from "../../src/utils/vector";
import { World } from "../../src/world/world";
import { BLOCK_DATA, BlockType } from "../../src/blockdata";

export class ChunkRenderer extends Renderer {
  constructor(public chunk: Chunk, world: World) {
    super();
    this.setActiveTexture(canvas.textures.textureAtlas);
    this.getBufferData(world);
  }

  render(camera: Camera) {
    // this.form.render(this.pos, screenPos, screenRot);
    this.renderObject(this.chunk.pos.data, camera);
  }

  // return if there is a cube (or void) at this position
  private isCube(pos: Vector3D, world: World) {
    let cube = this.chunk.getCube(pos);
    // if it isn't in the cube map, see if the world contains it
    if (pos.get(1) === -1) { return true; }
    if (!cube) {
      const chunkPos = world.worldPosToChunkPos(pos);
      const chunk = world.chunks.get(chunkPos.toString());
      if (!chunk) return true;
      cube = chunk.getCube(pos);
      if (!cube) {
        return false;
      }
    }
    const blockData = BLOCK_DATA.get(cube.type);

    if (blockData.blockType === BlockType.x) {
      return false;
    }


    return true;
  }

  // have an options to launch this on a worker thread (maybe always have it on a different thread)
  getBufferData(world: World) {
    // console.log("Chunk update");
    const visibleCubePosMap = new Map<string, {cube: Cube, faceVectors: Vector3D[]}>();

    const addVisibleFace = (cube: Cube, directionVector: Vector3D) => {
      let visibleCubePos = visibleCubePosMap.get(cube.pos.toString());
      if (!visibleCubePos) {
        visibleCubePos = {
          cube: cube,
          faceVectors: []
        }
      }
      visibleCubePos.faceVectors.push(directionVector);
      visibleCubePosMap.set(cube.pos.toString(), visibleCubePos);
    }


    const positions: number[] = []; // used to store positions of vertices
    const indices: number[] = []; // used to store pointers to those vertices
    const textureCords: number[] = [];
    let offset = 0;
    for (const cube of this.chunk.getCubesIterable()) {
      const blockData = BLOCK_DATA.get(cube.type);
      const relativePos = arraySub(cube.pos.data, this.chunk.pos.data);
      const texturePos = TextureMapper.getTextureCords(cube.type);

      if (blockData.blockType === BlockType.cube) {

        // loop through all the faces to get their cords
        let count = 0;
        for (const face of [0, 1, 2, 3, 4, 5]) {
          // check to see if there is a cube touching me on this face
          const directionVector = Vector.unitVectors3D[face];
          const nearbyCube = this.isCube(cube.pos.add(directionVector), world);
          // skkkkkip
          if (nearbyCube) {
            continue;
          }

          // add the face to the list of visible faces on the chunk
          addVisibleFace(cube, directionVector);

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
      } else if (blockData.blockType === BlockType.x) {

        // the main verticies of an x
        // const vertices = [[0, 0, 0], [1, 0, 1], [1, 1, 1], [0, 1, 0]];

        const adjustedCords = Vector.xVectors.
          map(v => arrayAdd(v, relativePos)).
          flat();


        const triIndices = [0, 1, 2, 0, 2, 3].map(x => x + offset);
        const secondTriIndices = [0, 1, 2, 0, 2, 3].map(x => x + offset + 4);

        positions.push(...adjustedCords);
        indices.push(...triIndices, ...secondTriIndices);
        textureCords.push(...texturePos[0], ...texturePos[1]);

        offset += 8;
      }
    }
    this.chunk.visibleCubesFaces = Array.from(visibleCubePosMap.values());
    this.setBuffers(positions, indices, textureCords);
  }
}
