import { MobileController } from "./controllers/playerControllers/mobileController";
import { KeyboardPlayerEntityController } from "./controllers/playerControllers/keyboardPlayerController";
import { getMyUid, IS_MOBILE } from "./utils";
import { EntityActionDto, SandBoxGScript } from "@craft/rust-world";
import { ClientDbGamesService } from "./services/sp-games-service";
import { HudGScript } from "./renders/hud-renderer";
import { GameRenderer, GameRendererGameScript } from "./renders/game-renderer";
import { GameWrapper } from "@craft/engine";

export const spGameService = await ClientDbGamesService.factory();

export interface RunningGame {
  game: GameWrapper;
  save: () => void;
  cleanup: () => void;
}

interface RunGameError {
  error: string;
}

export async function run(id?: string): Promise<RunningGame | RunGameError> {
  console.log("Starting game", id);

  const game = id ? await spGameService.getGame(id) : spGameService.newGame();

  console.log("Game Created", game);

  (window as any).game = game;

  if (!game) {
    console.error("Game not found");
    return {
      error: "Game not found",
    };
  }

  const mainPlayerUid = getMyUid();

  game.makeAndAddPlayer(mainPlayerUid);
  game.game.update();

  const ents = game.game.entities.get_all_clone();
  console.log("Ents", ents);

  // ===== Game Scripts =====
  console.log("Ensuring scripts");
  game.game.ensureScript(SandBoxGScript.name());
  console.log("Sandbox done");
  game.game.ensureScript(GameRendererGameScript.name);
  console.log("Game Renderer done");

  const gameRenderer = new GameRenderer(game, mainPlayerUid);
  const hudRender = new HudGScript(game.game, gameRenderer, mainPlayerUid);

  const onAction = (action: EntityActionDto) => {
    game.game.handle_action_wasm(action);
  };

  const playerController = (() => {
    if (IS_MOBILE) {
      return new MobileController(onAction, mainPlayerUid);
    } else {
      return new KeyboardPlayerEntityController(
        game.game,
        onAction,
        () => {
          spGameService.saveGame(game);
        },
        mainPlayerUid,
        gameRenderer
      );
    }
  })();

  async function task() {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  let running = true;

  const update = async () => {
    const start = performance.now();
    game.game.handle_actions();
    game.game.run_scripts();
    await task();
    game.game.add_new_entities();
    await task();
    game.game.remove_entities();
    await task();
    game.game.add_single_chunk();
    await task();
    game.game.add_blocks();
    await task();
    game.game.remove_blocks();
    await task();
    playerController.update();
    await task();
    gameRenderer.update();
    await task();
    hudRender.update(0);
    await task();
    gameRenderer.renderLoop(0);
    const end = performance.now();
    if (end - start > 50) {
      console.warn("Large update happened. Time: ", end - start);
    }
    if (running) {
      requestAnimationFrame(update);
    }
  };

  requestAnimationFrame(update);

  gameRenderer.renderLoop(0);

  return {
    game,
    save: () => {
      spGameService.saveGame(game);
    },
    cleanup: () => {
      running = false;
      gameRenderer.cleanup();
      hudRender.cleanup();
    },
  };
}
