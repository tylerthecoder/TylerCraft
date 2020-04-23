import { Controller } from "./controller";
import { Player } from "../../src/entities/player";
import { game } from "../game";

export class PlayerKeyboardController extends Controller {
  timer = 0;

  maxTime = 100;

  constructor(public controlled: Player) {
    super();
    this.setKeyListeners();
  }

  keysChange() {
    // // maybe only do this on a tick
    // this.ifHasKeyThenAddMeta("w", "forward");
    // this.ifHasKeyThenAddMeta("s", "backward");
    // this.ifHasKeyThenAddMeta("d", "right");
    // this.ifHasKeyThenAddMeta("a", "left");
    // this.ifHasKeyThenAddMeta(" ", "jump");
    // this.ifHasKeyThenAddMeta("f", "fireball");
    // console.log(this.keys);
    // console.log((this.controlled as Player).metaActions);
    // this.sendKeys();
  }

  sendKeys() {
    // game.socket.send({
    //   type: "keys",
    //   payload: {
    //     keys: Array.from(this.keys),
    //     rot: this.controlled.rot,
    //     uid: this.controlled.uid
    //   }
    // });
  }

  sendPos() {
    // const message = {
    //   type: "pos",
    //   payload: {
    //     pos: this.controlled.pos,
    //     uid: this.controlled.uid
    //   }
    // };
    // game.socket.send(message);
  }

  update(delta: number) {
    this.wasdKeys(delta);
    this.ifHasKeyThenAddMeta(" ", "jump");
    this.ifHasKeyThenAddMeta("f", "fireball");
    this.playerKeys();
    if (++this.timer >= this.maxTime) {
      this.sendPos();
      this.timer = 0;
    }
  }
}
