import { Camera } from "./camera";
import { IDim } from "../../types";
import { Vector3D } from "../../src/utils/vector";

export class FixedCamera extends Camera {
  constructor(public pos: Vector3D, public rot: IDim) {
    super();
  }

  rotateBy(x: number, y: number) {
    const speed = 0.002;
    const dx = x * speed;
    const dy = y * speed;
    this.rotate([-dy, dx, 0]);
  }
}
