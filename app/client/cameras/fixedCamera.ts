import { Camera } from "./camera";
import { IDim } from "../../types";
import { Vector3D } from "../../src/utils/vector";

export class FixedCamera extends Camera {
  constructor(public pos: Vector3D, public rot: IDim) {
    super();
  }

  handleMouse(e: MouseEvent) {
    const speed = 0.002;
    const dx = e.movementX * speed;
    const dy = e.movementY * speed;
    this.rotate([-dy, dx, 0]);
  }
}
