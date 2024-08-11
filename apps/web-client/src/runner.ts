import { GameWrapper } from "@craft/engine/modules";
import { CanvasGameScript } from "./game-scripts/canvas-gscript";
import { getMyUid, IS_MOBILE } from "./app";
import { WebGlGScript } from "./game-scripts/webgl-gscript";
import { MobileController } from "./controllers/playerControllers/mobileController";
import { KeyboardPlayerEntityController } from "./controllers/playerControllers/keyboardPlayerController";
import { PlayerActionService } from "@craft/engine";

function run() {
  // Start the game

  const game = GameWrapper.makeGame();

  const main_player_uid = getMyUid();

  game.makeAndAddPlayer(main_player_uid);

  const playerActionService = new PlayerActionService(game);

  const playerController = () => {
    if (IS_MOBILE) {
      return new MobileController(playerActionService, game, main_player_uid);
    } else {
      return new KeyboardPlayerEntityController(
        playerActionService,
        game,
        main_player_uid
      );
    }
  };

  const webglGameScript = new WebGlGScript(game);

  const canvasGameScript = new CanvasGameScript(
    game,
    webglGameScript,
    main_player_uid
  );

  game.makeGameScript(canvasGameScript);
}
