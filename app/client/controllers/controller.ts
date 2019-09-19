import { Entity } from "../../src/entities/entity";
import { Player } from "../../src/entities/player";
import { Camera } from "../cameras/camera";
import { ClientGame } from "../game";
import { IDim } from "../../types";
import { toSphereCords } from "../../src/utils";

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

  wasdKeys(delta: number) {
    if (!(this.controlled instanceof Entity)) return;
    const entity = this.controlled as Entity;

    const speed = 0.01 * delta * entity.speed;

    const k = (key: string, amount: [number, number, number]) => {
      if (this.keys.has(key)) {
        entity.move(toSphereCords(...amount) as IDim);
      }
    };

    k("w", [-speed, -entity.rot[1], Math.PI / 2]);
    k("s", [speed, -entity.rot[1], Math.PI / 2]);
    k("a", [speed, -entity.rot[1] - Math.PI / 2, Math.PI / 2]);
    k("d", [speed, -entity.rot[1] + Math.PI / 2, Math.PI / 2]);
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
    if (!(this.controlled instanceof Entity)) return;
    const entity = this.controlled as Entity;

    const speed = 0.1 * entity.speed;

    if (this.keys.has("q")) entity.move([0, speed, 0]);
    if (this.keys.has("e")) entity.move([0, -speed, 0]);
  }
}
