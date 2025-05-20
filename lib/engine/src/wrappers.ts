import * as WorldWasm from "@craft/rust-world";
import { Vector2D, Vector3D } from "./vector.js";
import { Camera } from "./camera.js";
import { GameScript } from "./game-script.js";
import { World } from "@craft/rust-world";
export * as WorldModuleTypes from "@craft/rust-world";

export interface ISerializedChunk {
  position: {
    x: number;
    y: number;
  };
  blocks: WorldWasm.BlockType[];
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

export interface ILookingAtData {
  cube: Cube;
  face: WorldWasm.Direction;
  dist: number;
}

export type ISerializedVisibleFaces = Array<{
  world_pos: RustPos;
  faces: [boolean, boolean, boolean, boolean, boolean, boolean];
}>;

export type GameDiffWrapper = {
  updated_entities: number[];
  updated_chunks: number[];
};

// export type GameScript = {
//   onDiff: (diff: GameDiff) => void;
// };

export type Cube = {
  type: WorldWasm.BlockType;
  pos: Vector3D;
};

// export type ChunkMesh = {
//   mesh: Array<{ block: Cube; faces: WorldWasm.Direction[] }>;
//   chunkPos: { x: number; y: number };
// };

type RustChunkMesh = Array<[RustBlock, { data: boolean[] }]>;

export class ChunkMeshWrapper {
  mesh: Array<[BlockWrapper, WorldWasm.Direction[]]>;

  constructor(mesh: RustChunkMesh) {
    this.mesh = mesh.map(([block, faces]) => [
      new BlockWrapper(block),
      faces.data.map((_, i) => i as WorldWasm.Direction),
    ]);
  }
}

export class PlayerWrapper {
  speed = 0;
  max_speed = 0;
  gravity = 0;
  uid = 0;
  pos: Vector3D = new Vector3D([0, 0, 0]);
  dim: Vector3D = new Vector3D([0, 0, 0]);
  rot: Vector3D = new Vector3D([0, 0, 0]);
  is_flying = false;
  on_ground = false;
  distanceMoved = 0;
  moving_direction: WorldWasm.Direction | undefined;

  constructor(player: WorldWasm.WasmPlayer) {
    this.pos = new Vector3D([player.pos.x, player.pos.y, player.pos.z]);
    this.dim = new Vector3D([1, 1, 1]);
    this.rot = new Vector3D([0, player.rot.phi, player.rot.theta]);
    this.moving_direction = player.moving_direction;
  }
}

type RustBlock = {
  block_type: WorldWasm.BlockType;
  extra_data: string;
  world_pos: RustPos;
};

export class BlockWrapper {
  pos: Vector3D;
  type: WorldWasm.BlockType;

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
  constructor(public game: WorldWasm.Game) { }

  static makeGame(): GameWrapper {
    const game = new WorldWasm.Game();
    return new GameWrapper(game);
  }

  makeAndAddPlayer(uid: number) {
    this.game.make_and_add_player_wasm(uid);
  }

  serializeEntities(): SerializedEntity[] {
    return this.game.serialize_entities_wasm();
  }

  makeJumpAction(entityId: number): WorldWasm.EntityActionDto {
    return WorldWasm.JumpAction.make_wasm(entityId);
  }

  makeRotateAction(
    entityId: number,
    theta: number,
    phi: number
  ): WorldWasm.EntityActionDto {
    const rotDiff = WorldWasm.SphericalRotation.new_wasm(theta, phi);
    return WorldWasm.RotateAction.make_wasm(entityId, rotDiff);
  }

  makeMoveAction(
    entityId: number,
    direction: WorldWasm.Direction | "None"
  ): WorldWasm.EntityActionDto {
    console.log("Making move action", entityId, direction);
    if (direction === "None") {
      return WorldWasm.MoveAction.make_wasm(entityId, undefined);
    }
    return WorldWasm.MoveAction.make_wasm(entityId, direction);
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
    const wasmScript = WorldWasm.WasmGameScript.make(script);
    this.game.add_game_script_wasm(wasmScript);
  }

  getChunkMeshFromChunkPos(chunkId: number): ChunkMeshWrapper {
    const id = BigInt(chunkId);
    console.log("Getting chunk mesh", chunkId);
    const val = this.game.get_chunk_mesh_by_chunkid_wasm(id);
    console.log("Got chunk mesh", val);
    return new ChunkMeshWrapper(val);
  }

  getPlayer(uid: number): PlayerWrapper {
    const player: WorldWasm.WasmPlayer = this.game.get_player_wasm(uid);
    return new PlayerWrapper(player);
  }

  getBlock(pos: Vector3D): BlockWrapper {
    const block = this.game.get_block_wasm(pos.get(0), pos.get(1), pos.get(1));
    return new BlockWrapper(block);
  }

  getEntities(): PlayerWrapper[] {
    const entities: WorldWasm.WasmPlayer[] = this.game.get_players_wasm();
    return entities.map((entity) => this.getPlayer(entity.id));
  }

  getLoadedChunkIds(): number[] {
    const chunkIds = this.game.get_loaded_chunk_ids_wasm();
    return Array.from(chunkIds).map(Number);
  }

  getPointedAtBlock(camera: Camera): ILookingAtData {
    // todo
    throw new Error("Not implemented");
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
