import { IAction } from ".";
import { ISerializedEntity } from "../src/entities/entity";
import { ISerializedChunk } from "../src/world/chunk";

export const enum ISocketMessageType {
  // from client
  getChunk, // server sends setChunk
  newWorld, // server sends welcome
  saveWorld,
  // this could be for joining an existing world or starting up an old one
  joinWorld, // server sends welcome
  // from server
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
  entities: ISerializedEntity[];
}

interface ISocketMessage {
  type: ISocketMessageType;
  // from client
  joinWorldPayload?: {
    myUid: string;
    worldId: string;
  },
  newWorldPayload?: {
    myUid: string;
  },
  saveWorldPayload?: {
    worldId: string;
  },
  getChunkPayload?: {
    pos: string,
  }

  // from server
  welcomePayload?: ISocketWelcomePayload,
  newPlayerPayload?: {
    uid: string,
  },
  playerLeavePayload?: {
    uid: string,
  },
  setChunkPayload?: {
    pos: string,
    data: ISerializedChunk,
  }

  // from either
  actionPayload?: IAction[];
}