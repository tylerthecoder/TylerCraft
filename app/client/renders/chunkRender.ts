import { Renderer } from "./renderer";
import { canvas } from "../canvas";
import { Camera } from "../../src/camera";
import { Chunk } from "../../src/world/chunk";
import { arrayMul, arrayAdd, arraySub } from "../../src/utils";
import TextureMapper from "../textureMapper";
import { Cube } from "../../src/entities/cube";
import { Vector3D, Vector } from "../../src/utils/vector";
import { World } from "../../src/world/world";
import { BLOCK_DATA, BlockType } from "../../src/blockdata";


type IVisibleFaceMap = Map<string, { cube: Cube, faceVectors: Vector3D[] }>;

export class ChunkRenderer extends Renderer {
  constructor(public chunk: Chunk, world: World) {
    super();
    this.setActiveTexture(canvas.textures.textureAtlas);
    this.getBufferData(world);
  }

  render(camera: Camera, trans?: boolean): void {
    this.renderObject(this.chunk.pos.data, camera, trans);
  }

  // return if there is a cube (or void) at this position
  private isCube(pos: Vector3D, world: World, currentCube: Cube) {

    // This is outside of the world, so we don't have to show this face
    if (pos.get(1) < 0) return true;

    const cube = world.getBlockFromWorldPoint(pos);
    if (cube === null) return false;


    const blockData = BLOCK_DATA.get(cube.type)!;
    const currentCubeBlockData = BLOCK_DATA.get(currentCube.type)!;

    if (blockData.blockType === BlockType.fluid && currentCubeBlockData.blockType === BlockType.fluid) {
      return true;
    }

    if (blockData.transparent) {
      return false;
    }

    return true;
  }

  private addVisibleFace(faceMap: IVisibleFaceMap, cube: Cube, directionVector: Vector3D) {
    let visibleCubePos = faceMap.get(cube.pos.toIndex());
    if (!visibleCubePos) {
      visibleCubePos = {
        cube: cube,
        faceVectors: []
      }
    }
    visibleCubePos.faceVectors.push(directionVector);
    faceMap.set(cube.pos.toIndex(), visibleCubePos);
  }

  private getDataForBlock(cube: Cube, offset: number, world: World, visibleFaceMap: IVisibleFaceMap): { addToOffset: number, positions: number[], indices: number[], textureCords: number[] } {
    const blockData = BLOCK_DATA.get(cube.type)!;
    const relativePos = arraySub(cube.pos.data, this.chunk.pos.data);
    const texturePos = TextureMapper.getTextureCords(cube.type);
    const positions: number[] = [];
    const indices: number[] = [];
    const textureCords: number[] = [];
    if (blockData.blockType === BlockType.cube || blockData.blockType === BlockType.fluid) {

      // loop through all the faces to get their cords
      let count = 0;
      for (const face of [0, 1, 2, 3, 4, 5]) {
        // check to see if there is a cube touching me on this face
        const directionVector = Vector3D.unitVectors[face];
        const nearbyCube = this.isCube(cube.pos.add(directionVector), world, cube);
        // skkkkkip
        if (nearbyCube) {
          continue;
        }

        // add the face to the list of visible faces on the chunk
        this.addVisibleFace(visibleFaceMap, cube, directionVector);

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

      return {
        addToOffset: count,
        positions,
        indices,
        textureCords,
      }
    } else if (blockData.blockType === BlockType.x) {

      const adjustedCords = Vector.xVectors.
        map(v => arrayAdd(v, relativePos)).
        flat();


      const triIndices = [0, 1, 2, 0, 2, 3].map(x => x + offset);
      const secondTriIndices = [0, 1, 2, 0, 2, 3].map(x => x + offset + 4);

      positions.push(...adjustedCords);
      indices.push(...triIndices, ...secondTriIndices);
      textureCords.push(...texturePos[0], ...texturePos[1]);

      // make a flower still "hittable"
      for (const directionVector of Vector3D.unitVectors) {
        this.addVisibleFace(visibleFaceMap, cube, directionVector);
      }

      return {
        addToOffset: 8,
        positions,
        indices,
        textureCords,
      }
    } else {
      throw new Error("")
    }
  }

  // have an options to launch this on a worker thread (maybe always have it on a different thread)
  getBufferData(world: World): void {
    // console.log("Chunk update");
    const visibleCubePosMap = new Map<string, { cube: Cube, faceVectors: Vector3D[] }>();

    // const addVisibleFace = (cube: Cube, directionVector: Vector3D) => {
    //   let visibleCubePos = visibleCubePosMap.get(cube.pos.toIndex());
    //   if (!visibleCubePos) {
    //     visibleCubePos = {
    //       cube: cube,
    //       faceVectors: []
    //     }
    //   }
    //   visibleCubePos.faceVectors.push(directionVector);
    //   visibleCubePosMap.set(cube.pos.toIndex(), visibleCubePos);
    // }


    const positions: number[] = []; // used to store positions of vertices
    const indices: number[] = []; // used to store pointers to those vertices
    const textureCords: number[] = [];
    let offset = 0;

    const transPositions: number[] = [];
    const transIndices: number[] = [];
    const transTextureCords: number[] = [];
    let transOffset = 0;

    this.chunk.blocks.iterate(cube => {
      const blockData = BLOCK_DATA.get(cube.type)!;

      if (!blockData) {
        console.log(cube);
      }

      if (blockData.transparent) {
        const {
          addToOffset, positions: p, indices: i, textureCords: t
        } = this.getDataForBlock(cube, transOffset, world, visibleCubePosMap);
        transOffset += addToOffset;
        transPositions.push(...p);
        transIndices.push(...i);
        transTextureCords.push(...t);
      } else {
        const {
          addToOffset, positions: p, indices: i, textureCords: t
        } = this.getDataForBlock(cube, offset, world, visibleCubePosMap);
        offset += addToOffset;
        positions.push(...p);
        indices.push(...i);
        textureCords.push(...t);
      }
    })

    this.chunk.visibleCubesFaces = Array.from(visibleCubePosMap.values());
    this.setBuffers(positions, indices, textureCords, transPositions, transIndices, transTextureCords);
  }
}
