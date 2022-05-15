import { IS_MOBILE } from "../app";
import { canvas } from "../canvas";
import { ClientGame } from "../clientGame";
import { Controller, Controlled, GameController } from "./controller";
import { MouseAndKeyController } from "./gameKeyboardController";
import { MobileController } from "./mobileController";
import { Quest2Controller } from "./quest2Controller";


export class ControllerHolder {
  controllers: Controller[] = [];

  private gameController: GameController;

  /** Must be initialized after canvas */
  init(clientGame: ClientGame) {
    // Add the main game controller
    const getGameControllerClass = () => {
      if (IS_MOBILE) {
        return MobileController;
      } else if (canvas.isXr) {
        return Quest2Controller;
      } else {
        return MouseAndKeyController;
      }
    }

    const gameControllerClass = getGameControllerClass();
    this.gameController = new gameControllerClass(clientGame);
  }

  add(controller: Controller) {
    this.controllers.push(controller);
  }

  getGameController() {
    return this.gameController;
  }

  update(delta: number) {
    this.gameController.update(delta);
    for (const controller of this.controllers) {
      controller.update(delta);
    }
  }

  remove(controlled: Controlled) {
    this.controllers = this.controllers.filter(controller => {
      return controller.controlled !== controlled;
    });
  }
}