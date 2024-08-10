import { GameWrapper } from "@craft/engine/modules";
import { CanvasGameScript } from "./game-scripts/canvas-gscript";

function run() {
  // Start the game

  const game = GameWrapper.createGame();

  const canvasGameScript = new CanvasGameScript(game);

  game.makeGameScript(canvasGameScript);
}
