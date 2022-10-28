import WorldWasm from "@craft/rust-world";
import { Game } from "./game";
import { IChunkReader } from "./types";
import { Vector2D } from "./utils/vector";
import { Chunk, ISerializedChunk, ISerializedWorld, World } from "./world";

export * as WorldModuleTypes from "@craft/rust-world";

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

  public createWorld(
    game: Game,
    chunkReader: IChunkReader,
    data?: ISerializedWorld
  ) {
    const wasmWorld = this.module.World.new_wasm();
    return new World(wasmWorld, game, chunkReader, data);
  }

  public createChunk(chunkPos: Vector2D): Chunk {
    const wasmChunk = this.module.Chunk.make_wasm(
      chunkPos.get(0),
      chunkPos.get(1)
    );
    return new Chunk(wasmChunk, chunkPos);
  }

  public createChunkFromSerialized(data: ISerializedChunk): Chunk {
    const wasmChunk = this.module.Chunk.deserialize(data);
    const chunkPos = new Vector2D([data.position.x, data.position.y]);
    return new Chunk(wasmChunk, chunkPos);
  }
}

const WorldModule = new WorldModuleClass();
export default WorldModule;
