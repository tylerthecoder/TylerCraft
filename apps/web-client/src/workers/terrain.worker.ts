import {
  IConfig,
  Vector2D,
  WorldModule,
  TerrainGenModule,
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

// // We alias self to ctx and give it our newly created type
const ctx: Worker = self as any;

console.log("Log from worker");

let terrainGenerator: ReturnType<typeof TerrainGenModule.getTerrainGenerator>;

ctx.onmessage = async function (e: IWorkerMessage) {
  await WorldModule.load();
  if (e.data.type === "getChunk") {
    const pos = new Vector2D([e.data.x, e.data.y]);
    const chunk = terrainGenerator.getChunk(pos);
    return chunk;
  } else if (e.data.type === "setConfig") {
    terrainGenerator = TerrainGenModule.getTerrainGenerator(
      Number(e.data.config.seed),
      e.data.config.terrain.flatWorld
    );
  }
};
