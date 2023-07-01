import * as WorldWasm from "@craft/rust-world";
import { Vector2D } from "./utils/vector.js";
import { Chunk, ISerializedChunk } from "./world/index.js";
export * as WorldModuleTypes from "@craft/rust-world";

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
    if (this._module) {
      return;
    }
    console.log("Loading WorldWasm engine", WorldWasm);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wasm = WorldWasm as any;
    if (wasm.default?.then) {
      (wasm as { default: Promise<typeof WorldWasm> }).default
        .then((data) => (this._module = data))
        .then(() => console.log("Modules Loaded ES6", this._module));
    } else {
      // It may or may not be a promise
      this._module = await wasm;
      console.log("Modules Loaded node", this._module);
    }
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