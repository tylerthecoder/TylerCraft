import Random from "../src/utils/random";
import { Vector, Vector2D } from "../src/utils/vector";
import { Chunk, ISerializedChunk } from "../src/world/chunk";
import { TerrainGenerator } from "../src/world/terrainGenerator";
// import terrainService from "./build/terrain2.js";

let terrainServiceInstance: any;

interface IWorkerMessage {
  data: {
    messageType: "getChunk";
    x: number;
    y: number;
  }
}

interface IWorkerResponse {
  data: Uint8Array;
}

// declare var onmessage: (e: IWorkerMessage) => void;
// declare var postMessage: (e: IWorkerResponse) => void;

// declare const self: DedicatedWorkerGlobalScope;
// export { };


// We alias self to ctx and give it our newly created type
const ctx: Worker = self as any;

ctx.onmessage = function (e: IWorkerMessage) {
  console.log("Received message", e.data);

  const chunk = getChunk2(e.data.x, e.data.y);

  postMessage(
    chunk,
    null
  );
}

// terrainService().then((instance: any) => {
//   terrainServiceInstance = instance;
// });

const CHUNK_DATA_LENGTH = 16 * 16 * 64;

const chunks = new Map<string, Chunk>();

const terrainGenerator = new TerrainGenerator(
  pos => chunks.has(pos.toIndex()),
  pos => chunks.get(pos.toIndex()),
);

Random.setSeed("bungus");

const getChunk2 = (x: number, y: number): ISerializedChunk => {
  const pos = new Vector2D([x, y]);


  const chunk = terrainGenerator.generateChunk(pos);

  chunks.set(chunk.chunkPos.toIndex(), chunk);

  console.log(chunk);

  return chunk.serialize();
}

// const getChunk = (x: number, y: number): Uint8Array => {
//   const chunkPtr = terrainServiceInstance._getChunkBlocks(2, 3);
//   console.log(chunkPtr);

//   const blocksArray = new Uint8Array(new ArrayBuffer(CHUNK_DATA_LENGTH));

//   for (let i = 0; i < CHUNK_DATA_LENGTH; i++) {
//     const block = terrainServiceInstance.HEAP8[chunkPtr + i];
//     blocksArray[i] = block;
//     if (block != 0) {
//       console.log(block, i);
//     }
//   }

//   return blocksArray;
// }

