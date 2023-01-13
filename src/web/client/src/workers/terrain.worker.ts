// import {
//   IConfig,
//   Vector2D,
//   ISerializedChunk,
//   TerrainGenerator,
//   Random,
//   Chunk,
//   setConfig,
// } from "@craft/engine";

// import {EntityCamera} from "../cameras/entityCamera";

export const t = () => {
  console.log("t");
}


// interface IGetChunkMessage {
//   type: "getChunk";
//   x: number;
//   y: number;
// }

// interface ISetConfigMessage {
//   type: "setConfig";
//   config: IConfig;
// }

// interface IWorkerMessage {
//   data: IGetChunkMessage | ISetConfigMessage;
// }

// // We alias self to ctx and give it our newly created type
// const ctx: Worker = self as any;

// ctx.onmessage = function (e: IWorkerMessage) {
//   if (e.data.type === "getChunk") {
//     const chunk = getChunk2(e.data.x, e.data.y);

//     postMessage(chunk);
//   } else if (e.data.type === "setConfig") {
//     setConfig(e.data.config);
//   }
// };

// const chunks = new Map<string, Chunk>();

// const terrainGenerator = new TerrainGenerator(
//   (pos) => chunks.has(pos.toIndex()),
//   (pos) => chunks.get(pos.toIndex())
// );

// Random.setSeed("bungus");

// const getChunk2 = (x: number, y: number): ISerializedChunk => {
//   const pos = new Vector2D([x, y]);

//   const chunk = terrainGenerator.generateChunk(pos);

//   chunks.set(chunk.uid, chunk);

//   return chunk.serialize();
// };
