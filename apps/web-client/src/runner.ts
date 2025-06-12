import { CanvasGameScript } from "./game-scripts/canvas-gscript";
import { WebGlGScript } from "./game-scripts/webgl-gscript";
import { MobileController } from "./controllers/playerControllers/mobileController";
import { KeyboardPlayerEntityController } from "./controllers/playerControllers/keyboardPlayerController";
import { getMyUid, IS_MOBILE } from "./utils";
import { EntityActionDto, SandBoxGScript } from "@craft/rust-world";
import { ClientDbGamesService } from "./services/sp-games-service";
import { HudGScript } from "./game-scripts/hudRender";

export const spGameService = await ClientDbGamesService.factory();

export async function run(id?: string) {
  console.log("Starting game", id);

  const game = id ? await spGameService.getGame(id) : spGameService.newGame();

  console.log("Game", game);

  (window as any).game = game;

  if (!game) {
    console.error("Game not found");
    return;
  }

  const main_player_uid = getMyUid();

  game.makeAndAddPlayer(main_player_uid);
  game.game.update();

  const ents = game.game.entities.get_all_clone();
  console.log("Ents", ents);

  // ===== Game Scripts =====

  // add sandbox
  const sandbox = new SandBoxGScript();
  game.game.add_sandbox_wasm(sandbox);

  const webglGameScript = new WebGlGScript(game.game);
  game.makeAndAddGameScript(webglGameScript);

  const canvasGameScript = new CanvasGameScript(
    game.game,
    webglGameScript,
    main_player_uid
  );
  game.makeAndAddGameScript(canvasGameScript);

  const hudRender = new HudGScript(
    game.game,
    canvasGameScript,
    main_player_uid
  );

  const onAction = (action: EntityActionDto) => {
    game.game.handle_action_wasm(action);
  };

  const playerController = (() => {
    if (IS_MOBILE) {
      return new MobileController(onAction, main_player_uid);
    } else {
      return new KeyboardPlayerEntityController(
        game.game,
        onAction,
        () => {
          spGameService.saveGame(game);
        },
        main_player_uid,
        canvasGameScript
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
    canvasGameScript.update();
    await task();
    hudRender.update(0);
    await task();
    canvasGameScript.renderLoop(0);
    const end = performance.now();
    if (end - start > 50) {
      console.warn("Large update happened. Time: ", end - start);
    }
    requestAnimationFrame(update);
  };

  requestAnimationFrame(update);

  canvasGameScript.renderLoop(0);
}
