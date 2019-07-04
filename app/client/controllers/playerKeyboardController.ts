import { Controller } from "./controller";
import { SocketHandler } from "../socket";
import { Player } from "../../src/entities/player";

export class PlayerKeyboardController extends Controller {
  timer = 0;

  maxTime = 100;

  constructor(public controlled: Player) {
    super();
    this.setKeyListeners();
  }

  keysChange() {
    // maybe only do this on a tick
    this.sendKeys();
  }

  sendKeys() {
    SocketHandler.send({
      type: "keys",
      payload: {
        keys: Array.from(this.keys),
        rot: this.controlled.rot,
        uid: this.controlled.uid
      }
    });
  }

  sendPos() {
    const message = {
      type: "pos",
      payload: {
        pos: this.controlled.pos,
        uid: this.controlled.uid
      }
    };
    SocketHandler.send(message);
  }

  update(delta: number) {
    this.wasdKeys(delta);
    if (++this.timer >= this.maxTime) {
      this.sendPos();
      this.timer = 0;
    }
  }
}
