import { EntityActionDto, Game } from "@craft/rust-world";
import { HudGScript } from "../renders/hud-renderer";
import { IS_MOBILE, task } from "../utils";
import { MobileController } from "../controllers/mobileController";
import { KeyboardPlayerEntityController } from "../controllers/keyboardPlayerController";
import { GameRenderer } from "../renders/game-renderer";

export interface RunGameError {
  error: string;
}

function makeListenerGroup<T extends unknown[]>(listenerGroupName: string) {
  const listeners: Array<{ func: (...args: T) => void; name: string }> = [];
  return {
    addListener(func: (...args: T) => void, name: string) {
      listeners.push({ func, name });
    },
    callAll(...args: T) {
      for (const func of listeners) {
        console.log("Calling", listenerGroupName, func.name);
        func.func(...args);
      }
    },
  };
}

export class RunningGame {
  private running = true;
  private pendingActions: unknown[] = [];

  constructor(public game: Game, public playerId: number) {}

  public startListeners = makeListenerGroup<[]>("start");
  public start() {
    console.log("Starting game");
    this.startListeners.callAll();

    const updateWrapper = async () => {
      await this.update();
      if (this.running) {
        requestAnimationFrame(updateWrapper);
      }
    };

    requestAnimationFrame(updateWrapper);
  }

  public cleanupListeners = makeListenerGroup<[]>("cleanup");
  public cleanup() {
    console.log("Cleaning up game");
    this.running = false;
    this.cleanupListeners.callAll();
  }

  public updateListeners = makeListenerGroup<[]>("update");
  public async update() {
    const start = performance.now();
    // Drain pending actions from JS queue into Rust queue
    // This must happen in a synchronous block before any awaits
    for (const actionData of this.pendingActions) {
      this.game.handleAction(EntityActionDto.from_js(actionData));
    }
    this.pendingActions = [];
    this.game.handle_actions();
    this.game.run_scripts();
    await task();
    this.game.add_new_entities();
    await task();
    this.game.remove_entities();
    this.game.add_single_chunk();
    this.game.add_blocks();
    await task();
    this.game.remove_blocks();
    this.updateListeners.callAll();
    const end = performance.now();
    if (end - start > 50) {
      console.warn("Large update happened. Time: ", end - start);
    }
  }

  public onActionListeners = makeListenerGroup<[EntityActionDto]>("onAction");
  public onAction(action: EntityActionDto) {
    console.log("On Action", action);
    const serializedAction = action.to_js();
    // Queue in JS to avoid borrow conflicts during async update loop
    this.pendingActions.push(serializedAction);
    // Notify listeners with a copy
    this.onActionListeners.callAll(EntityActionDto.from_js(serializedAction));
  }

  /**
   * Queue an action from external sources (e.g., socket messages).
   * The action data should already be serialized JS object.
   */
  public queueAction(actionData: unknown) {
    this.pendingActions.push(actionData);
  }

  public saveListeners = makeListenerGroup<[]>("save");
  public save() {
    this.saveListeners.callAll();
  }
}

export function addPlayerController(
  runningGame: RunningGame,
  gameRenderer: GameRenderer
) {
  const getPlayerController = (runningGame: RunningGame) => {
    if (IS_MOBILE) {
      return new MobileController(runningGame.onAction, runningGame.playerId);
    }
    return new KeyboardPlayerEntityController(
      runningGame.game,
      runningGame.onAction.bind(runningGame),
      runningGame.save,
      runningGame.playerId,
      gameRenderer
    );
  };
  const playerController = getPlayerController(runningGame);
  runningGame.updateListeners.addListener(playerController.update, "update");
}

export async function addGameRenderer(
  runningGame: RunningGame,
  uiMessage: (message: string) => void
) {
  const gameRenderer = new GameRenderer(runningGame.game, runningGame.playerId);
  const update = () => {
    gameRenderer.update();
    gameRenderer.renderLoop(0);
  };
  const cleanup = () => {
    gameRenderer.cleanup();
  };
  runningGame.updateListeners.addListener(update, "update");
  runningGame.cleanupListeners.addListener(cleanup, "cleanup");

  uiMessage("Painting the world...");
  await task();
  gameRenderer.update();

  return gameRenderer;
}

export function addHudRenderer(
  runningGame: RunningGame,
  gameRenderer: GameRenderer
) {
  const hudRenderer = new HudGScript(
    runningGame.game,
    gameRenderer,
    runningGame.playerId
  );
  const update = () => {
    hudRenderer.update(0);
  };
  const cleanup = () => {
    hudRenderer.cleanup();
  };
  runningGame.updateListeners.addListener(update, "update");
  runningGame.cleanupListeners.addListener(cleanup, "cleanup");
  return hudRenderer;
}

export async function loadInitialChunks(
  runningGame: RunningGame,
  uiMessage: (message: string) => void
) {
  const { game } = runningGame;
  console.log("Loading initial chunks");
  async function task() {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  let pendingChunkCount = game.getPendingChunkCount();
  const initialChunkCount = pendingChunkCount;
  while (pendingChunkCount > 0) {
    uiMessage(
      `Loading chunks... ${
        initialChunkCount - pendingChunkCount
      } / ${initialChunkCount}`
    );
    await task();
    game.add_single_chunk();
    pendingChunkCount = game.getPendingChunkCount();
  }
}
