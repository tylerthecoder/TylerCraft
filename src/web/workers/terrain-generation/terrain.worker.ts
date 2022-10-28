import {
  IConfig,
  setConfig,
  Vector2D,
  ISerializedChunk,
  TerrainGenerator,
  Random,
  Chunk,
} from "@craft/engine";

interface IGetChunkMessage {
  type: "getChunk";
  x: number;
  y: number;
}

interface ISetConfigMessage {
  type: "setConfig";
  config: IConfig;
}

interface IWorkerMessage {
  data: IGetChunkMessage | ISetConfigMessage;
}

// interface IWorkerResponse {
//   data: Uint8Array;
// }

// declare var onmessage: (e: IWorkerMessage) => void;
// declare var postMessage: (e: IWorkerResponse) => void;

// declare const self: DedicatedWorkerGlobalScope;
// export { };

// We alias self to ctx and give it our newly created type
const ctx: Worker = self as any;

ctx.onmessage = function (e: IWorkerMessage) {
  if (e.data.type === "getChunk") {
    const chunk = getChunk2(e.data.x, e.data.y);

    postMessage(chunk);
  } else if (e.data.type === "setConfig") {
    setConfig(e.data.config);
  }
};

// terrainService().then((instance: any) => {
//   terrainServiceInstance = instance;
// });

// const CHUNK_DATA_LENGTH = 16 * 16 * 64;

const chunks = new Map<string, Chunk>();

const terrainGenerator = new TerrainGenerator(
  (pos) => chunks.has(pos.toIndex()),
  (pos) => chunks.get(pos.toIndex())
);

Random.setSeed("bungus");

const getChunk2 = (x: number, y: number): ISerializedChunk => {
  const pos = new Vector2D([x, y]);

  const chunk = terrainGenerator.generateChunk(pos);

  chunks.set(chunk.uid, chunk);

  return chunk.serialize();
};

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
