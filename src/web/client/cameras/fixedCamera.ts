import { Camera } from "@craft/engine/camera";
import { Vector3D } from "@craft/engine/utils/vector";

export class FixedCamera extends Camera {
  constructor(public pos: Vector3D, public rot: Vector3D) {
    super();
  }

  rotateBy(x: number, y: number) {
    const speed = 0.002;
    const dx = x * speed;
    const dy = y * speed;
    this.rot = new Vector3D([1, dx, dy]);
  }
}
