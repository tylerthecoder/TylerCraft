import * as WorldWasm from "@craft/rust-world";
import * as TerrainGenWasm from "@craft/terrain-gen";
import { Vector2D, Vector3D } from "./utils/vector.js";
import { World } from "./index.js";
export * as WorldModuleTypes from "@craft/rust-world";

async function loadWasmModule(module: any, name = "") {
  console.log("Loading Wasm Module: ", name);
  const loadedModule = module.default ? await module.default : await module;
  console.log(`Loaded Wasm Module: ${name} 🎉`);
  return loadedModule;
}
export interface ISerializedChunk {
  position: {
    x: number;
    y: number;
  };
  blocks: WorldWasm.BlockType[];
  block_data: ("None" | { Image: string })[];
}

type ISerializedChunkHolder = ISerializedChunk[];

export interface ISerializedWorld {
  chunks: ISerializedChunkHolder;
}

export type SerializedGame = {
  world: ISerializedWorld;
  players: Player[];
};

export type PlayerAction = WorldWasm.PlayerJumpAction;

export type GameDiff = {
  updated_entities: number[];
  updated_chunks: number[];
};

export type GameScript = {
  onDiff: (diff: GameDiff) => void;
};

export type Cube = {
  type: WorldWasm.BlockType;
  pos: Vector3D;
};

export type ChunkMesh = {
  mesh: Array<{ block: Cube; faces: WorldWasm.Direction[] }>;
  chunkPos: { x: number; y: number };
};

export type Player = {
  speed: number;
  max_speed: number;
  gravity: number;
  uid: number;
  pos: {
    x: number;
    y: number;
    z: number;
  };
  dim: {
    x: number;
    y: number;
    z: number;
  };
  rot: {
    theta: number;
    phi: number;
  };
  vel: {
    x: number;
    y: number;
    z: number;
  };
  is_flying: boolean;
  on_ground: boolean;
  moving_directions: WorldWasm.Direction[];
};

export class GameWrapper {
  constructor(private game: WorldWasm.Game) {}

  static createGame(): GameWrapper {
    const game = WorldWasm.Game.new_wasm();
    return new GameWrapper(game);
  }

  makeJumpAction(entityId: number) {
    return WorldWasm.PlayerJumpAction.make_wasm(entityId);
  }

  handleAction(action: WorldWasm.EntityAction) {
    this.game.handle_action_wasm(action);
  }

  makeGameScript(script: GameScript) {
    return WorldWasm.WasmGameScript.make(script);
  }

  addGameScript(script: WorldWasm.WasmGameScript) {
    this.game.add_game_script_wasm(script);
  }

  getChunkMeshFromChunkId(chunkId: number): ChunkMesh {
    const big = BigInt(chunkId);
    return this.game.get_chunk_mesh_from_chunk_id(big);
  }

  handlePlayerAction(action: PlayerAction) {}
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

  public createWorld(data?: ISerializedWorld) {
    console.log("Creating wasm world");
    const wasmWorld = WorldModule.module.World.new_wasm();
    const world = new World(wasmWorld, data);
    return world;
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
