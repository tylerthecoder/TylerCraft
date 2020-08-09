import { Controller } from "./controller";
import { Entity } from "../../src/entities/entity";

export class SpectatorController extends Controller {
  constructor(public controlled: Entity) {
    super();
    this.setKeyListeners();
    controlled.gravitable = false;
  }

  // other people do not need to see spectators
  // so we do not need to send to socket
  keysChange() {}

  update(delta: number) {
    this.wasdKeys(delta);
    this.qeKeys();
  }
}
