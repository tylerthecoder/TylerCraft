import { BlockType, BLOCK_DATA } from "../../src/blockdata";
import { Cube, CUBE_DIM } from "../../src/entities/cube";
import { arrayAdd, arrayMul, arraySub } from "../../src/utils";
import { Vector, Vector3D } from "../../src/utils/vector";
import { Chunk, ISerializedChunk } from "../../src/world/chunk";
import TextureMapper from "../textureMapper";


const ctx: Worker = self as any;

type IVisibleFaceMap = Map<string, { cube: Cube, faceVectors: Vector3D[] }>;

export interface IChunkRendererWorkerMessage {
  chunk: ISerializedChunk;
  surroundingChunks: ISerializedChunk[];
}

export interface IWorkerResponse {
  chunkPos: string;
  positions: Float32Array;
  indices: Uint16Array;
  textureCords: Float32Array;
  transPositions: Float32Array;
  transIndices: Uint16Array;
  transTextureCords: Float32Array;
  visibleFaces: Array<{ cube: Cube; faceVectors: Vector3D[] }>;
}

ctx.onmessage = (message: MessageEvent<IChunkRendererWorkerMessage>) => {
  // Calculate the index buffers
  const { chunk: c, surroundingChunks: sc } = message.data;

  const chunk = Chunk.deserialize(c);
  const surroundingChunks = sc.map(chunk => Chunk.deserialize(chunk));
  const data = getBufferData(chunk, surroundingChunks);

  ctx.postMessage(data);
}

const getBufferData = (chunk: Chunk, surroundingChunks: Chunk[]): IWorkerResponse => {
  // console.log("Chunk update");
  const visibleCubePosMap = new Map<string, { cube: Cube, faceVectors: Vector3D[] }>();

  const positions: number[] = []; // used to store positions of vertices
  const indices: number[] = []; // used to store pointers to those vertices
  const textureCords: number[] = [];
  let offset = 0;

  const transPositions: number[] = [];
  const transIndices: number[] = [];
  const transTextureCords: number[] = [];
  let transOffset = 0;

  chunk.blocks.iterate(cube => {
    const blockData = BLOCK_DATA.get(cube.type)!;

    if (!blockData) {
      console.log(cube);
    }

    if (blockData.transparent) {
      const {
        addToOffset, positions: p, indices: i, textureCords: t
      } = getDataForBlock(chunk, cube, transOffset, surroundingChunks, visibleCubePosMap);
      transOffset += addToOffset;
      transPositions.push(...p);
      transIndices.push(...i);
      transTextureCords.push(...t);
    } else {
      const {
        addToOffset, positions: p, indices: i, textureCords: t
      } = getDataForBlock(chunk, cube, offset, surroundingChunks, visibleCubePosMap);
      offset += addToOffset;
      positions.push(...p);
      indices.push(...i);
      textureCords.push(...t);
    }
  })

  return {
    chunkPos: chunk.pos.toIndex(),
    positions: new Float32Array(positions),
    indices: new Uint16Array(indices),
    textureCords: new Float32Array(textureCords),
    transPositions: new Float32Array(transPositions),
    transIndices: new Uint16Array(transIndices),
    transTextureCords: new Float32Array(transTextureCords),
    visibleFaces: Array.from(visibleCubePosMap.values()),
  }
}

const getDataForBlock = (chunk: Chunk, cube: Cube, offset: number, surroundingChunks: Chunk[], visibleFaceMap: IVisibleFaceMap): { addToOffset: number, positions: number[], indices: number[], textureCords: number[] } => {
  const blockData = BLOCK_DATA.get(cube.type)!;
  const relativePos = arraySub(cube.pos.data, chunk.pos.data);
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
      const nearbyCube = isCube(cube.pos.add(directionVector), cube, [...surroundingChunks, chunk]);
      // skkkkkip
      if (nearbyCube) {
        continue;
      }

      // add the face to the list of visible faces on the chunk
      addVisibleFace(visibleFaceMap, cube, directionVector);

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

          const size = CUBE_DIM;

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
      addVisibleFace(visibleFaceMap, cube, directionVector);
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

const isCube = (pos: Vector3D, currentCube: Cube, chunks: Chunk[]) => {

  // This is outside of the world, so we don't have to show this face
  if (pos.get(1) < 0) return true;

  const cube = chunks
    .map(chunk => chunk.blocks.get(pos))
    .find(block => block !== null) ?? null;

  // const cube = world.getBlockFromWorldPoint(pos);
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

const addVisibleFace = (faceMap: IVisibleFaceMap, cube: Cube, directionVector: Vector3D) => {
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