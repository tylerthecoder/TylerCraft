import { Game } from "@tylercraft/src/game";
import { GameAction } from "@tylercraft/src/gameActions";

export abstract class GameController<Action = GameAction> {
  protected game: Game<Action>;

  constructor(
    game: Game<Action>,
  ) {
    this.game = game;
  }

  abstract update(delta: number): void;
}
