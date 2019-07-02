import { Entity } from "../entities/entity";
import { Player } from "../entities/player";
import { IDim } from "..";

export abstract class Controller {
  keys = new Set();

  keysPressed = new Set();

  constructor() {}

  abstract entity: Entity;
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
    const speed = 0.01 * delta;

    const k = (key: string, amount: [number, number, number]) => {
      if (this.keys.has(key)) {
        this.entity.move(this.getSphereCords(...amount));
      }
    };

    k("w", [-speed, -this.entity.rot[1], Math.PI / 2]);
    k("s", [speed, -this.entity.rot[1], Math.PI / 2]);
    k("a", [speed, -this.entity.rot[1] - Math.PI / 2, Math.PI / 2]);
    k("d", [speed, -this.entity.rot[1] + Math.PI / 2, Math.PI / 2]);

    if (this.entity instanceof Player) {
      if (this.keys.has(" ")) {
        this.entity.jump();
      }

      if (this.keys.has("f")) {
        this.entity.fireball();
      } else {
        this.entity.canFire = true;
      }

      if (this.keysPressed.has("v")) {
        this.keysPressed.delete("v");
        this.entity.thirdPerson = !this.entity.thirdPerson;
      }
    }
  }

  qeKeys() {
    const speed = 0.1;

    if (this.keys.has("q")) this.entity.move([0, speed, 0]);
    if (this.keys.has("e")) this.entity.move([0, -speed, 0]);
  }
}
