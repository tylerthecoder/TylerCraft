import {
  EntityActionDto,
  GameDiff,
  SerializedEntityHolder,
} from "@craft/rust-world";

export interface MessageDto<
  MESSAGE extends string,
  DATA extends Record<MESSAGE, unknown>
> {
  readonly type: MESSAGE;
  readonly data: DATA[MESSAGE];
}

export class MessageHolder<T extends string, DATA extends Record<T, unknown>> {
  constructor(public type: T, public data: DATA[T]) { }

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
  joinWorld = "joinWorld",

  // from server
  welcome = "welcome",
  gameDiff = "gameDiff",

  // from both
  actions = "actions",
}

export interface WelcomeMessage {
  uid: string;
  entities: SerializedEntityHolder;
}

export interface SocketMessageData extends Record<ISocketMessageType, unknown> {
  [ISocketMessageType.joinWorld]: {
    myUid: string;
    worldId: string;
  };
  [ISocketMessageType.actions]: EntityActionDto;
  [ISocketMessageType.gameDiff]: GameDiff;
  [ISocketMessageType.welcome]: WelcomeMessage;
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
