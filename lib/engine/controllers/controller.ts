import { Game } from "../game.js";

export abstract class GameController {
  protected game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  abstract update(delta: number): void;
}
