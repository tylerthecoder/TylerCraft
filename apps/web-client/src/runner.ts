import { GameWrapper, PlayerActionService } from "@craft/engine";
import { CanvasGameScript } from "./game-scripts/canvas-gscript";
import { WebGlGScript } from "./game-scripts/webgl-gscript";
import { MobileController } from "./controllers/playerControllers/mobileController";
import { KeyboardPlayerEntityController } from "./controllers/playerControllers/keyboardPlayerController";
import { getMyUid, hideElement, IS_MOBILE, showElement } from "./utils";
import { eStartMenu } from "./elements";

export function run() {
  // Start the game

  hideElement(eStartMenu);

  const game = GameWrapper.makeGame();

  const main_player_uid = getMyUid();

  game.makeAndAddPlayer(main_player_uid);
  game.update();

  const ents = game.getEntities();
  console.log("Ents", ents);

  const playerActionService = new PlayerActionService(game);

  const webglGameScript = new WebGlGScript(game);

  const canvasGameScript = new CanvasGameScript(
    game,
    webglGameScript,
    main_player_uid
  );

  game.makeAndAddGameScript(canvasGameScript);

  // const hudGameScript = new HudGScript(game, canvasGameScript, main_player_uid);

  const playerController = (() => {
    if (IS_MOBILE) {
      return new MobileController(playerActionService, game, main_player_uid);
    } else {
      return new KeyboardPlayerEntityController(
        playerActionService,
        game,
        main_player_uid,
        canvasGameScript,
        webglGameScript
      );
    }
  })();

  // make the camera

  const update = () => {
    game.update();
    playerController.update();
    canvasGameScript.update();
    canvasGameScript.renderLoop(0);
    // const mesh = game.getChunkMeshFromChunkPos(4);
    // console.log("Mesh", mesh);
  };

  setInterval(update, 1000 / 60);

  console.log("Starting");

  console.log(canvasGameScript);

  canvasGameScript.renderLoop(0);
  // canvasGameScript.renderLoop(100);
  // canvasGameScript.renderLoop(200);
  // canvasGameScript.setup();
}

run();
