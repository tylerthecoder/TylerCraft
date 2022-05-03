import { ClientGame } from "../clientGame";
import { Controller, Controlled } from "./controller";


export class ControllerHolder {
  controllers: Controller[] = [];

  add(controller: Controller) {
    this.controllers.push(controller);
  }

  getGameController() {
    return this.controllers.filter(controller => {
      return controller.controlled instanceof ClientGame;
    })[0];
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