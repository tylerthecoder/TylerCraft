import {
  World,
  Game,
  Entities,
  BlockType,
  GameScripts,
  ChunkFetcher,
} from "@craft/rust-world";

const log = (...args: any[]) => {
  console.log(`[${new Date().toISOString()}] serialize.ts: `, ...args);
};

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

export interface ISerializedScript {
  scripts: Array<{
    config: string;
    name: string;
  }>;
}

export interface ISerializedChunk {
  position: {
    x: number;
    y: number;
  };
  blocks: BlockType[];
  block_data: ("None" | { Image: string })[];
}

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

export interface ISerializedGame {
  gameId: string;
  name: string;
  entities: Entities;
  world: World;
  scripts: ISerializedScript;
  chunkFetcher: ISerializedChunkFetcher;
}

export const deserializeGame = (serializedGame: ISerializedGame): Game => {
  const start = performance.now();
  const world = World.deserialize_wasm(serializedGame.world);
  const entityHolder = Entities.deserialize(serializedGame.entities);
  const scripts = GameScripts.fromJs(serializedGame.scripts);
  const chunkFetcher = ChunkFetcher.deserialize(serializedGame.chunkFetcher);
  const game = Game.build(
    serializedGame.gameId,
    serializedGame.name,
    world,
    entityHolder,
    scripts,
    chunkFetcher
  );
  const end = performance.now();
  log("Deserialized game in", end - start, "ms");
  return game;
};

export const serializeGame = (game: Game): ISerializedGame => {
  return {
    gameId: game.id,
    name: game.name,
    entities: game.serializeEntities(),
    world: game.world.serialize_wasm(),
    chunkFetcher: game.serializeChunkFetcher(),
    scripts: game.getScriptsJs(),
  };
};
