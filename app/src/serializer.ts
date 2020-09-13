import { IDim } from "../types";
import { BLOCKS } from "./blockdata";
import { Cube } from "./entities/cube";
import { Vector, Vector2D } from "./utils/vector";
import { Chunk } from "./world/chunk";


type SerializedCubeData = Array<[pos: string, type: BLOCKS]>;
type SerializedVisibleData = Array<[pos: string, visible: Array<IDim>]>;
interface SerializedChunk {
  chunkPos: string,
  cubes: SerializedCubeData,
  // vis: SerializedVisibleData,
}


export function serializeChunk(chunk: Chunk): string {
  const cubeData: SerializedCubeData = [];
  // const visibleData: SerializedVisibleData = [];

  for (const [pos, cube] of chunk.cubes.entries()) {
    cubeData.push([pos, cube.type]);
  }

  // for (const visData of chunk.visibleCubesFaces) {
  //   visibleData.push([visData.cube.pos.toString(), visData.faceVectors.map(d => d.data as IDim)]);
  // }

  const dataToSend: SerializedChunk = {
    chunkPos: chunk.chunkPos.toString(),
    cubes: cubeData,
    // vis: visibleData,
  }

  return JSON.stringify(dataToSend);
}

export function deserializeChunk(data: string): Chunk {
  const chunkData = JSON.parse(data) as SerializedChunk

  const chunkPos = Vector.fromString(chunkData.chunkPos) as Vector2D;

  const chunk = new Chunk(chunkPos);
  chunk.cubes = new Map(
    chunkData.cubes.map(data => {
      const cube = new Cube(
        data[1],
        Vector.fromString(data[0]),
      );
      return [data[0], cube];
    })
  );

  // this.visibleCubesFaces = chunkData.vis.map(data => {
  //   return {
  //     cube: this.cubes.get(data[0]),
  //     faceVectors: data[1].map(d => new Vector(d))
  //   }
  // });

  return chunk;
}