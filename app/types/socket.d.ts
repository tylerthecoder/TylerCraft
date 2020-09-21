import { IAction } from ".";

export const enum ISocketMessageType {
  actions,
  getChunk,
  sendChunk,
  welcome,
  newPlayer,
  playerLeave,
}

export interface ISocketWelcomePayload {
  uid: string;
  players: string[];
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
  sendChunkPayload?: {
    pos: string,
    data: string,
  }
}