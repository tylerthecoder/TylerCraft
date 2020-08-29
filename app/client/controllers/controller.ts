import { Entity, MetaAction } from "../../src/entities/entity";
import { Player } from "../../src/entities/player";
import { Camera } from "../cameras/camera";
import { ClientGame, game } from "../clientGame";

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

  ifHasKeyThenAddMeta(key: string, metaAction: MetaAction) {
    if (this.controlled instanceof Entity) {
      if (this.keys.has(key))
        this.controlled.metaActions.add(metaAction);
      else {
        this.controlled.metaActions.delete(metaAction);
      }
    }
  }

  wasdKeys(_delta: number) {
    this.ifHasKeyThenAddMeta("w", MetaAction.forward);
    this.ifHasKeyThenAddMeta("s", MetaAction.backward);
    this.ifHasKeyThenAddMeta("d", MetaAction.right);
    this.ifHasKeyThenAddMeta("a", MetaAction.left);
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
    this.ifHasKeyThenAddMeta(" ", MetaAction.up);
    this.ifHasKeyThenAddMeta("shift", MetaAction.down);
  }
}
