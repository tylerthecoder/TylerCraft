import { Game } from "@craft/engine/game";
import { GameAction } from "@craft/engine/gameActions";

export abstract class GameController<Action = GameAction> {
  protected game: Game<Action>;

  constructor(
    game: Game<Action>,
  ) {
    this.game = game;
  }

  abstract update(delta: number): void;
}
