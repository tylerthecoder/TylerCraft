import { Controller, Controlled } from "./controllers/controller";
import { GameController } from "./controllers/gameController";
import { ClientGame } from "./clientGame";
import { canvas } from "./canvas";


export class ControllerHolder {
  controllers: Controller[] = [];

  constructor(game: ClientGame) {
    const gameController = new GameController(game, canvas);
    this.add(gameController);
  }

  add(controller: Controller) {
    this.controllers.push(controller);
  }

  update(delta: number) {
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