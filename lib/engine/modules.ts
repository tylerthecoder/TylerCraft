import * as WorldWasm from "@craft/rust-world";
import * as TerrainGenWasm from "@craft/terrain-gen";
import { Vector2D } from "./utils/vector.js";
import {
  GameAction,
  IChunkReader,
  ISerializedChunk,
  ISerializedWorld,
  SandboxGScript,
  World,
} from "./index.js";
export * as WorldModuleTypes from "@craft/rust-world";

async function loadWasmModule(module: any, name = "") {
  console.log("Loading Wasm Module: ", name);
  const loadedModule = module.default ? await module.default : await module;
  console.log(`Loaded Wasm Module: ${name} 🎉`);
  return loadedModule;
}

(window as any).test = async () => {
  await WorldModule.load();
  const game = WorldModule.createGame();
  const player = WorldModule.createPlayer(Number(1));
  game.addPlayer(player);
};

export class GameWrapper {
  constructor(private game: WorldWasm.Game) {}

  handleAction(action: GameAction) {
    this.game.handle_action_wasm(action);
  }

  addPlayer(player: WorldWasm.Player) {
    this.game.add_entity_wasm(player);
  }
}

export type PlayerAction = "Jump" | { Move: WorldWasm.Direction[] };

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

  public createWorld(data?: ISerializedWorld) {
    console.log("Creating wasm world");
    const wasmWorld = WorldModule.module.World.new_wasm();
    const world = new World(wasmWorld, data);
    return world;
  }

  public createGame(): GameWrapper {
    const game = WorldModule.module.Game.new();
    return new GameWrapper(game);
  }

  public createPlayer(uid: number) {
    const player = WorldModule.module.Player.make(uid);
    return player;
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

  getParkorTerrainGenerator(seed: number) {
    const terrainGenerator = this.module.ParkorChunkGetter.new();

    return {
      getChunk: (chunkPos: Vector2D) => {
        console.log("Generating Chunk", chunkPos);
        const chunk = terrainGenerator
          .get_chunk_wasm(chunkPos.get(0), chunkPos.get(1))
          .serialize();
        return chunk as unknown as ISerializedChunk;
      },
    };
  }

  getTerrainGenerator(seed: number, flatWorld: boolean) {
    const terrainGenerator = new this.module.TerrainGenerator(seed, flatWorld);

    return {
      getChunk: (chunkPos: Vector2D) => {
        console.log("Generating Chunk", chunkPos);
        const chunk = terrainGenerator
          .get_chunk(chunkPos.get(0), chunkPos.get(1))
          .serialize();
        return chunk as unknown as ISerializedChunk;
      },
    };
  }
}

export const TerrainGenModule = new TerrainGenModuleClass();
