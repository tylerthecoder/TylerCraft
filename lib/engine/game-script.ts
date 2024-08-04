import { GameAction } from "./gameActions.js";
import { Entity, Game, GameStateDiff } from "./index.js";
import { GameWrapper } from "./modules.js";

export type GameScriptConfig = Record<string, any> | undefined;

export abstract class GameScript<
  Config extends GameScriptConfig = GameScriptConfig
> {
  abstract name: string;
  actions?: { [key: string]: () => void };

  config?: Config;

  constructor(protected game: Game, ..._args: unknown[]) {}

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
