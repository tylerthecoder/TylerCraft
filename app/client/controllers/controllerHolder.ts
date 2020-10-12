import { Controller, Controlled } from "./controller";


export class ControllerHolder {
  controllers: Controller[] = [];

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