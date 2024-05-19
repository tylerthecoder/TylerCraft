import { Game } from "./game.js";
import { GameAction } from "./gameActions.js";
import { Entity } from "./index.js";

export interface IGameScriptConstuctor {
  new (game: Game): IGameScript;
}

export interface IGameScript {
  // Called for every game loop
  update?(delta: number): void;

  onGameAction?(action: GameAction): void;

  onNewEntity?(entity: Entity): void;

  onRemovedEntity?(entity: Entity): void;
}
