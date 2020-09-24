import { IAction } from ".";
import { ISerializedEntity } from "../src/entities/entity";
import { ISerializedChunk } from "../src/world/chunk";

export const enum ISocketMessageType {
  // from client
  getChunk, // server sends setChunk
  joinGame, // server sends welcome
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
  entities: ISerializedEntity[];
}

interface ISocketMessage {
  type: ISocketMessageType;
  uid?: string;
  actionPayload?: IAction[];
  welcomePayload?: ISocketWelcomePayload,
  newPlayerPayload?: {
    uid: string,
  },
  playerLeavePayload?: {
    uid: string,
  },
  getChunkPayload?: {
    pos: string,
  }
  setChunkPayload?: {
    pos: string,
    data: ISerializedChunk,
  }
}