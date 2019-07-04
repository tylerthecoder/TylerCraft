import { Entity } from "../../src/entities/entity";
import { Player } from "../../src/entities/player";
import { Camera } from "../cameras/camera";
import { ClientGame } from "../game";
import { IDim } from "../../types";

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

  getSphereCords(r: number, t: number, p: number) {
    const cords = [
      r * Math.sin(p) * Math.sin(t),
      r * Math.cos(p),
      r * Math.sin(p) * Math.cos(t)
    ];
    return cords as IDim;
  }

  wasdKeys(delta: number) {
    if (!(this.controlled instanceof Entity)) return;

    const entity = this.controlled as Entity;

    const speed = 0.01 * delta * entity.speed;

    const k = (key: string, amount: [number, number, number]) => {
      if (this.keys.has(key)) {
        entity.move(this.getSphereCords(...amount));
      }
    };

    k("w", [-speed, -entity.rot[1], Math.PI / 2]);
    k("s", [speed, -entity.rot[1], Math.PI / 2]);
    k("a", [speed, -entity.rot[1] - Math.PI / 2, Math.PI / 2]);
    k("d", [speed, -entity.rot[1] + Math.PI / 2, Math.PI / 2]);

    if (entity instanceof Player) {
      if (this.keys.has(" ")) {
        entity.jump();
      }

      if (this.keys.has("f")) {
        entity.fireball();
      } else {
        entity.canFire = true;
      }
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
