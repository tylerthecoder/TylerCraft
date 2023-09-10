import * as WorldWasm from "@craft/rust-world";
import * as TerrainGenWasm from "@craft/terrain-gen";
import { Vector2D } from "./utils/vector.js";
import { Chunk, ISerializedChunk } from "./world/index.js";
export * as WorldModuleTypes from "@craft/rust-world";

async function loadWasmModule(module: any) {
  console.log("Loading Wasm Module");
  const loadedModule = module.default ? await module.default : await module;
  console.log("Loaded Wasm Module", loadedModule);
  return loadedModule;
}

// Wrapper class for world logic
class WorldModuleClass {
  private _module: typeof WorldWasm | null = null;

  public get module() {
    if (!this._module) {
      throw new Error("Module not loaded");
    }
    return this._module;
  }

  async load(): Promise<void> {
    this._module = await loadWasmModule(TerrainGenWasm);
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

const WorldModule = new WorldModuleClass();
export default WorldModule;

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
    this._module = await loadWasmModule(TerrainGenWasm);
  }

  genChunk(chunkPos: Vector2D): Chunk {
    throw new Error("Method not implemented.");
    // return new Chunk(
    //   this.module.get_chunk_wasm(chunkPos.get(0), chunkPos.get(1)),
    //   chunkPos
    // );
  }
}

export const TerrainGenModule = new TerrainGenModuleClass();
