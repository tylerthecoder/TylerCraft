import { Game, GameController } from "@craft/engine";
import { CanvasGameScript } from "../game-scripts/canvas-gscript";
import { renderGameMenu } from "../renders/gameMenuRender";

export function getEleOrError<T extends HTMLElement>(id: string): T {
  const ele = document.getElementById(id);
  if (!ele) throw new Error(`Could not find element with id ${id}`);
  return ele as T;
}

export class MouseAndKeyboardGameController extends GameController {
  constructor(game: Game) {
    super(game);

    renderGameMenu(game);

    window.addEventListener("keydown", (e) => {
      this.handleKeyDown(e.key);
    });
  }

  private handleKeyDown(key: string) {
    if (key === "v") {
      const canvasScript = this.game.getGameScript(CanvasGameScript);
      canvasScript.toggleThirdPerson();
    }
  }

  update(_delta: number) {
    return false;
  }
}
