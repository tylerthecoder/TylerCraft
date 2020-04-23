import { Entity } from "../../src/entities/entity";
import { Player } from "../../src/entities/player";
import { Camera } from "../cameras/camera";
import { ClientGame, game } from "../game";

export type Controlled = Entity | Camera | ClientGame | Player;

export abstract class Controller {
  keys = new Set();

  keysPressed = new Set();

  constructor() {}

  abstract controlled: Controlled;

  abstract update(delta: number): void;
  abstract keysChange(): void;

  setKeyListeners() {
    window.addEventListener("keydown", ({ key }) => {
      this.keys.add(key.toLowerCase());
      this.keysChange();
    });
    window.addEventListener("keyup", ({ key }) => {
      this.keys.delete(key.toLowerCase());
      this.keysPressed.add(key.toLowerCase());
      this.keysChange();
    });
  }

  ifHasKeyThenAddMeta(key: string, metaAction: string) {
    if (this.keys.has(key))
      (this.controlled as Player).metaActions.add(metaAction);
    else {
      (this.controlled as Player).metaActions.delete(metaAction);
    }
  }

  wasdKeys(delta: number) {
    this.ifHasKeyThenAddMeta("w", "forward");
    this.ifHasKeyThenAddMeta("s", "backward");
    this.ifHasKeyThenAddMeta("d", "right");
    this.ifHasKeyThenAddMeta("a", "left");
  }

  playerKeys() {
    if (!(this.controlled instanceof Player)) return;
    const player = this.controlled as Player;

    if (this.keys.has(" ")) {
      player.jump();
    }

    if (this.keys.has("f")) {
      player.fireball();
    } else {
      player.canFire = true;
    }
  }

  qeKeys() {
    this.ifHasKeyThenAddMeta("q", "up");
    this.ifHasKeyThenAddMeta("e", "down");
  }
}
