import { IConfig } from "./config.js";
import { EntityDto } from "./entities/entity.js";
import { PlayerActionDto } from "./entities/player/playerActions.js";
import {
  Game,
  IContructGameOptions,
  IGameMetadata,
  ISerializedGame,
} from "./game.js";
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

export interface IGamesService {
  createGame(options: IContructGameOptions): Promise<Game>;
  getGame(gameId: string): Promise<Game | null>;
  getAllGames(): Promise<IGameMetadata[]>;
  saveGame(game: Game): Promise<void>;
  deleteGame(gameId: string): Promise<void>;
}

export enum ISocketMessageType {
  // from client
  getChunk = "getChunk", // server sends setChunk
  newWorld = "newWorld", // server sends welcome
  saveWorld = "saveWorld",
  // this could be for joining an existing world or starting up an old one
  joinWorld = "joinWorld", // server sends welcome or worldNotFound
  // from server
  welcome = "welcome",
  worldNotFound = "worldNotFound",
  gameDiff = "gameDiff",
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
    name: string;
  };
  [ISocketMessageType.saveWorld]: {
    worldId: string;
  };
  [ISocketMessageType.getChunk]: {
    pos: string;
  };
  [ISocketMessageType.welcome]: ISocketWelcomePayload;
  [ISocketMessageType.worldNotFound]: {};
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
  game: ISerializedGame;
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
