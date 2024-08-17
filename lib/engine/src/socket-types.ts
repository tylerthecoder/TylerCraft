import { IConfig } from "./config.js";

export interface MessageDto<
  MESSAGE extends string,
  DATA extends Record<MESSAGE, unknown>
> {
  readonly type: MESSAGE;
  readonly data: DATA[MESSAGE];
}

export class MessageHolder<T extends string, DATA extends Record<T, unknown>> {
  constructor(public type: T, public data: DATA[T]) {}

  getDto() {
    return {
      type: this.type,
      data: this.data,
    };
  }

  isType<U extends T>(type: U): this is MessageHolder<U, DATA> {
    return type === this.type;
  }
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
  // [ISocketMessageType.welcome]: ISocketWelcomePayload;
  // [ISocketMessageType.worldNotFound]: {};
  // [ISocketMessageType.setChunk]: {
  //   pos: string;
  //   data: ISerializedChunk;
  // };
  // [ISocketMessageType.newPlayer]: {
  //   uid: string;
  // };
  // [ISocketMessageType.playerLeave]: {
  //   uid: string;
  // };
  // [ISocketMessageType.gameDiff]: GameDiffDto;
  // [ISocketMessageType.actions]: GameActionDto;
  // [ISocketMessageType.playerActions]: PlayerActionDto;
}

// export interface ISocketWelcomePayload {
//   uid: string;
//   game: ISerializedGame;
// }

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
