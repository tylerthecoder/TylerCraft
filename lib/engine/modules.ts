import * as WorldWasm from "@craft/rust-world";
import * as TerrainGenWasm from "@craft/terrain-gen";
import { Vector2D } from "./utils/vector.js";
import { Chunk, ISerializedChunk } from "./world/index.js";
import { IChunkReader, ISerializedWorld, World } from "./index.js";
export * as WorldModuleTypes from "@craft/rust-world";

async function loadWasmModule(module: any, name = "") {
  console.log("Loading Wasm Module: ", name);
  const loadedModule = module.default ? await module.default : await module;
  console.log(`Loaded Wasm Module: ${name} 🎉`);
  return loadedModule;
}

// Wrapper class for world logic
class WorldModuleClass {
  private _module: typeof WorldWasm | null = null;

  private get module() {
    if (!this._module) {
      throw new Error("Module not loaded");
    }
    return this._module;
  }

  async load(): Promise<void> {
    if (this._module) return;
    this._module = await loadWasmModule(WorldWasm, "World");
  }

  public createWorld(chunkReader: IChunkReader, data?: ISerializedWorld) {
    console.log("Creating wasm world");
    const wasmWorld = WorldModule.module.World.new_wasm();
    const world = new World(wasmWorld, chunkReader, data);
    return world;
  }

  public createChunk(chunkPos: Vector2D): Chunk {
    const wasmChunk = this.module.Chunk.make_wasm(
      chunkPos.get(0),
      chunkPos.get(1)
    );
    return new Chunk(wasmChunk, chunkPos);
  }

  public createChunkFromSerialized(data: ISerializedChunk): Chunk {
    console.log("Creating Chunk", data);
    const wasmChunk = this.module.Chunk.deserialize(data);
    const chunkPos = new Vector2D([data.position.x, data.position.y]);
    return new Chunk(wasmChunk, chunkPos);
  }
}

export const WorldModule = new WorldModuleClass();

class TerrainGenModuleClass {
  private _module: typeof TerrainGenWasm | null = null;

  private get module() {
    if (!this._module) {
      throw new Error("Terrain gen module not loaded");
    }
    return this._module;
  }

  public async load(): Promise<void> {
    if (this._module) return;
    this._module = await loadWasmModule(TerrainGenWasm, "TerrainGen");
  }

  getTerrainGenerator(seed: number, flatWorld: boolean) {
    const terrainGenerator = new this.module.TerrainGenerator(seed, flatWorld);

    return {
      getChunk: (chunkPos: Vector2D) => {
        const chunk = terrainGenerator.get_chunk(
          chunkPos.get(0),
          chunkPos.get(1)
        );
        return new Chunk(chunk as any, chunkPos);
      },
    };
  }
}

export const TerrainGenModule = new TerrainGenModuleClass();
