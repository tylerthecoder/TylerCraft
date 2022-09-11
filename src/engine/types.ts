import { IConfig } from "./config.js";
import { EntityDto } from "./entities/entity.js";
import { ISerializedEntities } from "./entities/entityHolder.js";
import { Game, IGameMetadata, ISerializedGame } from "./game.js";
import { GameActionDto } from "./gameActions.js";
import { GameDiffDto } from "./gameStateDiff.js";
import { Chunk, ISerializedChunk } from "./world/chunk.js";
import {World} from "./world/world.js";

export type IDim = [number, number, number];


// Defs
// There are actions and state changes
// Actions are sent to the server to be converted to state changes that are then sent to the clients
// Servers can only just send state changes to the clients without any actions (An entity spawned, a timer went off)


export enum StateUpdateType {
  AddEntity,
  UpdateEntity,
  RemoveEntity,
  UpdateChunk
}

export interface IAddEntityStateUpdate {
  action: StateUpdateType.AddEntity;
  ent: EntityDto;
}

export interface IUpdateEntityStateUpdate {
  action: StateUpdateType.UpdateEntity;
  ent: Partial<EntityDto>;
}

export interface IEntityRemoveStateUpdate {
  action: StateUpdateType.RemoveEntity;
  uid: string;
}

export interface IChunkUpdateStateUpdate {
  action: StateUpdateType.UpdateChunk;
  chunk: ISerializedChunk;
}

export type StateUpdate =
  IAddEntityStateUpdate |
  IUpdateEntityStateUpdate |
  IEntityRemoveStateUpdate |
  IChunkUpdateStateUpdate;

export interface ICreateWorldOptions {
  gameName: string;
  config: IConfig;
}

export interface IChunkReader {
  getChunk(chunkPos: string, world: World): Promise<Chunk>;
}

export interface INullableChunkReader {
  getChunk(chunkPos: string, world: World): Promise<Chunk | null>;
}

export interface IWorldData {
  chunkReader: IChunkReader;
  worldId: string;
  name: string;
  config: IConfig;
  activePlayers?: string[];
  data?: ISerializedGame;
  multiplayer?: boolean;
}

export abstract class WorldModel {
  abstract createWorld(createWorldOptions: ICreateWorldOptions): Promise<IWorldData>;
  abstract getWorld(worldId: string): Promise<IWorldData | null>;
  abstract saveWorld(data: Game): Promise<void>;
  abstract getAllWorlds(): Promise<IGameMetadata[]>;
  abstract deleteWorld(worldId: string): Promise<void>;
}

export const enum ISocketMessageType {
  // from client
  getChunk, // server sends setChunk
  newWorld, // server sends welcome
  saveWorld,
  // this could be for joining an existing world or starting up an old one
  joinWorld, // server sends welcome
  // from server
  gameDiff,
  welcome,
  setChunk,
  newPlayer,
  playerLeave,
  // both
  actions,
}

export interface ISocketWelcomePayload {
  uid: string;
  worldId: string;
  entities: ISerializedEntities;
  activePlayers: string[];
  config: IConfig;
  name: string;
}

export interface ISocketMessage {
  type: ISocketMessageType;
  // from client
  joinWorldPayload?: {
    myUid: string;
    worldId: string;
  },
  newWorldPayload?: {
    myUid: string;
    config: IConfig;
    gameName: string;
  },
  saveWorldPayload?: {
    worldId: string;
  },
  getChunkPayload?: {
    pos: string,
  }

  // from server
  welcomePayload?: ISocketWelcomePayload,
  // newPlayerPayload?: {
  //   uid: string,
  // },
  // playerLeavePayload?: {
  //   uid: string,
  // },
  setChunkPayload?: {
    pos: string,
    data: ISerializedChunk,
  }
  gameDiffPayload?: GameDiffDto;

  // from either
  actionPayload?: GameActionDto;
}
