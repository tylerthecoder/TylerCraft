import { Controller } from "./controller";
import { ClientGame } from "../game";

export class GameController extends Controller {
  constructor(public controlled: ClientGame) {
    super();
    this.setKeyListeners();
  }

  keysChange() {}

  update(_delta: number) {
    if (this.keysPressed.has("v")) {
      this.keysPressed.delete("v");

      this.controlled.toggleThirdPerson();
    }
    if (this.keysPressed.has("c")) {
      this.keysPressed.delete("c");

      this.controlled.toggleSpectate();
    }
  }
}
