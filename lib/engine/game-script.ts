import { Game } from "./game.js";
import { GameAction } from "./gameActions.js";
import { Entity, GameStateDiff } from "./index.js";

export interface IGameScriptConstuctor {
  new (game: Game, ...args: any[]): IGameScript;
}

export interface IGameScript<
  Config extends Record<string, any> = Record<string, any>
> {
  actions?: { [key: string]: () => void };

  config?: Config;
  setConfig?(config: Config): void;

  setup?(): void | Promise<void>;

  // Called for every game loop
  update?(delta: number): void;

  onGameAction?(action: GameAction): void;

  onGameStateDiff?(stateDiff: GameStateDiff): void;

  onNewEntity?(entity: Entity): void;

  onRemovedEntity?(entity: Entity): void;

  onChunkUpdate?(chunkId: string): void;
}
