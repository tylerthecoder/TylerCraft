import { Vector2D, Vector3D } from "./vector.js";
import { GameScript } from "./game-script.js";
import {
  SandBoxGScript,
  TerrainGenerator,
  World,
  Game,
  Entities,
  Chunk,
  BlockType,
  Direction,
  Player,
  EntityActionDto,
  JumpAction,
  SphericalRotation,
  RotateAction,
  MoveAction,
  WasmGameScript,
  GameScripts,
  ChunkFetcher,
} from "@craft/rust-world";

export interface ISerializedAction {
  entity_id: number;
  name: string;
  data: any;
}

export interface IServerGameMetadata {
  gameId: string;
  name: string;
  isRunning: boolean;
  onlinePlayers: number;
}

export interface ISerializedChunkFetcher {
  type: string;
  json: any;
}

export interface ISerializedGame {
  gameId: string;
  name: string;
  entities: Entities;
  world: World;
  terrainGen: TerrainGenerator;
  sandbox: SandBoxGScript;
  scripts: ISerializedScript;
  chunkFetcher: ISerializedChunkFetcher;
}

export interface IGameMetadata {
  gameId: string;
  name: string;
}

export interface ISerializedScript {
  scripts: Array<{
    config: string;
    name: string;
  }>;
}

export const serializedGameToGame = (serializedGame: ISerializedGame): Game => {
  const world = World.deserialize_wasm(serializedGame.world);
  const entityHolder = Entities.from_js(serializedGame.entities);
  const scripts = GameScripts.fromJs(serializedGame.scripts);
  const chunkFetcher = ChunkFetcher.fromJs(serializedGame.chunkFetcher);
  const game = Game.build(
    serializedGame.gameId,
    serializedGame.name,
    world,
    entityHolder,
    scripts,
    chunkFetcher
  );
  return game;
};

export const getEntities = (game: Game) => {
  const entities = game.entities.to_js();
  // convert all the maps to objects
  const newEntities = entities.entities.map((entity: any) => {
    const components = entity.components.map((component: any) => {
      const componentKey = component[0];
      let componentValue = component[1];
      if (componentValue instanceof Map) {
        componentValue = Object.fromEntries(componentValue);
      }
      return [componentKey, componentValue];
    });
    return { ...entity, components };
  });
  return { entities: newEntities };
};

export const deserializeChunk = (chunk: ISerializedChunk): Chunk => {
  return Chunk.deserialize(chunk);
};

export interface ISerializedChunk {
  position: {
    x: number;
    y: number;
  };
  blocks: BlockType[];
  block_data: ("None" | { Image: string })[];
}

type RustPos = {
  x: number;
  y: number;
  z: number;
};

type ISerializedChunkHolder = ISerializedChunk[];

export interface ISerializedWorld {
  chunks: ISerializedChunkHolder;
}

export interface SerializedEntity {
  id: number;
  components: string[];
}

export interface SerializedEntities {
  entities: SerializedEntity[];
}

export type GameDiff = {
  updated_entities: number[];
  updated_chunks: number[];
};

export type ISerializedVisibleFaces = Array<{
  world_pos: RustPos;
  faces: [boolean, boolean, boolean, boolean, boolean, boolean];
}>;

export type Cube = {
  type: BlockType;
  pos: Vector3D;
};

type RustChunkMesh = Array<[RustBlock, { data: boolean[] }]>;

export class ChunkMeshWrapper {
  mesh: Array<[BlockWrapper, Direction[]]>;

  constructor(mesh: RustChunkMesh) {
    this.mesh = mesh.map(([block, faces]) => [
      new BlockWrapper(block),
      faces.data.map((_, i) => i as Direction),
    ]);
  }
}

type RustBlock = {
  block_type: BlockType;
  extra_data: string;
  world_pos: RustPos;
};

export class BlockWrapper {
  pos: Vector3D;
  type: BlockType;

  constructor(block: RustBlock) {
    this.pos = new Vector3D([
      block.world_pos.x,
      block.world_pos.y,
      block.world_pos.z,
    ]);
    this.type = block.block_type;
  }
}

export class GameWrapper {
  constructor(public game: Game) {}

  static makeGame(): GameWrapper {
    const game = new Game();
    return new GameWrapper(game);
  }

  makeAndAddPlayer(uid: number) {
    this.game.make_and_add_player_wasm(uid);
  }

  serializeEntities(): SerializedEntity[] {
    return this.game.entities.to_js();
  }

  makeJumpAction(entityId: number): EntityActionDto {
    return JumpAction.make_wasm(entityId);
  }

  makeRotateAction(
    entityId: number,
    theta: number,
    phi: number
  ): EntityActionDto {
    const rotDiff = SphericalRotation.new_wasm(theta, phi);
    return RotateAction.make_wasm(entityId, rotDiff);
  }

  makeMoveAction(
    entityId: number,
    direction: Direction | "None"
  ): EntityActionDto {
    console.log("Making move action", entityId, direction);
    if (direction === "None") {
      return MoveAction.make_wasm(entityId, undefined);
    }
    return MoveAction.make_wasm(entityId, direction);
  }

  getChunkPosFromChunkId(chunkId: number): Vector2D {
    const data: { x: number; y: number } = this.game.get_chunk_pos_from_id_wasm(
      BigInt(chunkId)
    );
    return new Vector2D([data.x, data.y]);
  }

  getChunkIdFromChunkPos(chunkPos: Vector2D): number {
    const data = {
      x: chunkPos.get(0),
      y: chunkPos.get(1),
    };
    return Number(this.game.get_chunk_id_from_chunk_pos_wasm(data));
  }

  makeAndAddGameScript(script: GameScript) {
    const wasmScript = new WasmGameScript(script);
    this.game.add_game_script_wasm(wasmScript);
  }

  getChunkMeshFromChunkPos(chunkId: number): ChunkMeshWrapper {
    const id = BigInt(chunkId);
    const start = performance.now();
    const val = this.game.get_chunk_mesh_by_chunkid_wasm(id);
    const end = performance.now();
    console.log("Time taken to get chunk mesh", end - start, " ms");
    return new ChunkMeshWrapper(val);
  }

  getPlayer(uid: number): Player {
    const player = this.game.entities.get_entity_as_player(uid);
    if (!player) {
      throw new Error("Player not found");
    }
    return player;
  }

  getBlock(pos: Vector3D): BlockWrapper {
    const block = this.game.get_block_wasm(pos.get(0), pos.get(1), pos.get(1));
    return new BlockWrapper(block);
  }

  getLoadedChunkIds(): number[] {
    const chunkIds = this.game.get_loaded_chunk_ids_wasm();
    return Array.from(chunkIds).map(Number);
  }

  getWorldPosFromChunkPos(chunkPos: Vector2D): Vector3D {
    const world_pos = this.game.get_world_pos_from_chunk_pos_wasm(
      chunkPos.get(0),
      chunkPos.get(1)
    );

    return new Vector3D([world_pos.x, world_pos.y, world_pos.z]);
  }

  getChunkPosFromWorldPos(worldPos: Vector3D): Vector2D {
    const chunk_pos = this.game.get_chunk_pos_from_world_pos_wasm(
      worldPos.get(0),
      worldPos.get(1),
      worldPos.get(2)
    );

    return new Vector2D([chunk_pos.x, chunk_pos.y]);
  }
}
