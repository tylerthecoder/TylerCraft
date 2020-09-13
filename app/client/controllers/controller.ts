import { Entity, MetaAction } from "../../src/entities/entity";
import { MovableEntity } from "../../src/entities/moveableEntity";
import { Player } from "../../src/entities/player";
import { Camera } from "../cameras/camera";
import { ClientGame} from "../clientGame";

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
    if (this.controlled instanceof MovableEntity) {
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
}
