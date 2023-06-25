import { Game } from "./game.js";
import { MessageDto, MessageHolder } from "./messageHelpers.js";

export enum GameActionType {
  Save = "save",
  ChangeName = "changeName",
}

export interface GameActionData extends Record<GameActionType, unknown> {
  [GameActionType.ChangeName]: {
    name: string;
  };
  [GameActionType.Save]: undefined;
}

export type GameActionDto = MessageDto<GameActionType, GameActionData>;

export class GameAction extends MessageHolder<GameActionType, GameActionData> {
  static create<T extends GameActionType>(type: T, data: GameActionData[T]) {
    return new GameAction(type, data);
  }
}

export class GameActionHandler {
  constructor(private game: Game) {}

  handle(action: GameAction) {
    if (action.isType(GameActionType.Save)) {
      this.game.save();
    }
  }
}
