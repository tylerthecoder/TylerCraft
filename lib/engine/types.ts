import { IConfig } from "./config.js";
import { EntityDto } from "./entities/entity.js";
import { ISerializedEntities } from "./entities/entityHolder.js";
import { PlayerActionDto } from "./entities/player/playerActions.js";
import { Game, IGameMetadata, ISerializedGame } from "./game.js";
import { GameActionDto } from "./gameActions.js";
import { GameDiffDto } from "./gameStateDiff.js";
import { MessageDto, MessageHolder } from "./messageHelpers.js";
import { Chunk, ISerializedChunk } from "./world/chunk.js";

export type IDim = [number, number, number];

// Defs
// There are actions and state changes
// Actions are sent to the server to be converted to state changes that are then sent to the clients
// Servers can only just send state changes to the clients without any actions (An entity spawned, a timer went off)

export enum StateUpdateType {
  AddEntity,
  UpdateEntity,
  RemoveEntity,
  UpdateChunk,
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
  | IAddEntityStateUpdate
  | IUpdateEntityStateUpdate
  | IEntityRemoveStateUpdate
  | IChunkUpdateStateUpdate;

export interface ICreateWorldOptions {
  gameName: string;
  config: IConfig;
}

export interface IChunkReader {
  getChunk(chunkPos: string): Promise<Chunk>;
}

export interface INullableChunkReader {
  getChunk(chunkPos: string): Promise<Chunk | null>;
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
  abstract createWorld(
    createWorldOptions: ICreateWorldOptions
  ): Promise<IWorldData>;
  abstract getWorld(worldId: string): Promise<IWorldData | null>;
  abstract saveWorld(data: Game): Promise<void>;
  abstract getAllWorlds(): Promise<IGameMetadata[]>;
  abstract deleteWorld(worldId: string): Promise<void>;
}

export enum ISocketMessageType {
  // from client
  getChunk = "getChunk", // server sends setChunk
  newWorld = "newWorld", // server sends welcome
  saveWorld = "saveWorld",
  // this could be for joining an existing world or starting up an old one
  joinWorld = "joinWorld", // server sends welcome
  // from server
  gameDiff = "gameDiff",
  welcome = "welcome",
  setChunk = "setChunk",
  newPlayer = "newPlayer",
  playerLeave = "playerLeave",
  // both
  actions = "actions",
  playerActions = "playerActions",
}

export interface SocketMessageData extends Record<ISocketMessageType, unknown> {
  [ISocketMessageType.joinWorld]: {
    myUid: string;
    worldId: string;
  };
  [ISocketMessageType.newWorld]: {
    myUid: string;
    config: IConfig;
    gameName: string;
  };
  [ISocketMessageType.saveWorld]: {
    worldId: string;
  };
  [ISocketMessageType.getChunk]: {
    pos: string;
  };
  [ISocketMessageType.welcome]: ISocketWelcomePayload;
  [ISocketMessageType.setChunk]: {
    pos: string;
    data: ISerializedChunk;
  };
  [ISocketMessageType.newPlayer]: {
    uid: string;
  };
  [ISocketMessageType.playerLeave]: {
    uid: string;
  };
  [ISocketMessageType.gameDiff]: GameDiffDto;
  [ISocketMessageType.actions]: GameActionDto;
  [ISocketMessageType.playerActions]: PlayerActionDto;
}

export interface ISocketWelcomePayload {
  uid: string;
  worldId: string;
  entities: ISerializedEntities;
  activePlayers: string[];
  config: IConfig;
  name: string;
}

export type SocketMessageDto = MessageDto<
  ISocketMessageType,
  SocketMessageData
>;

export class SocketMessage extends MessageHolder<
  ISocketMessageType,
  SocketMessageData
> {
  static make<T extends ISocketMessageType>(
    type: T,
    data: SocketMessageData[T]
  ) {
    return new SocketMessage(type, data);
  }
}
