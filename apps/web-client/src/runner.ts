import { WebGlGScript } from "./game-scripts/webgl-gscript";
import { MobileController } from "./controllers/playerControllers/mobileController";
import { KeyboardPlayerEntityController } from "./controllers/playerControllers/keyboardPlayerController";
import { getMyUid, IS_MOBILE } from "./utils";
import { EntityActionDto, SandBoxGScript } from "@craft/rust-world";
import { ClientDbGamesService } from "./services/sp-games-service";
import { HudGScript } from "./game-scripts/hudRender";
import {
  GameRenderer,
  GameRendererGameScript,
} from "./game-scripts/canvas-gscript";

export const spGameService = await ClientDbGamesService.factory();

export async function run(id?: string) {
  console.log("Starting game", id);

  const game = id ? await spGameService.getGame(id) : spGameService.newGame();

  console.log("Game Created", game);

  (window as any).game = game;

  if (!game) {
    console.error("Game not found");
    return;
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
    requestAnimationFrame(update);
  };

  requestAnimationFrame(update);

  gameRenderer.renderLoop(0);
}
