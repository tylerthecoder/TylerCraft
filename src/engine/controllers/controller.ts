import { Game } from "../game.js";
import { GameAction } from "../gameActions.js";

export abstract class GameController<Action = GameAction> {
  protected game: Game<Action>;

  constructor(
    game: Game<Action>,
  ) {
    this.game = game;
  }

  abstract update(delta: number): void;
}
