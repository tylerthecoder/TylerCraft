import { Entity } from "../../src/entities/entity";
import { canvas } from "../canvas";
import { IDim } from "../../src/index";

export abstract class Camera extends Entity {
  abstract pos: IDim;
  abstract rot: IDim;

  constructor() {
    super();
    window.addEventListener("mousedown", () => {
      canvas.canvas.requestPointerLock();
    });

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (document.pointerLockElement === canvas.canvas) {
        this.handleMouse(e);
      }
    });
  }

  update(_delta: number) {}
  render(_camera: Camera) {}

  abstract handleMouse(e: MouseEvent): void;
}
