import { Entity, RenderType, FaceLocater } from "./entity";
import { IDim } from "../../types";
import { Vector3D } from "../utils/vector";

export class Ball extends Entity {
  radius = 1;

  renderType = RenderType.SPHERE;

  constructor(
    public pos: Vector3D, public vel: IDim
  ) {
    super();

    this.dim = Array(3).fill(this.radius, 0, 3) as IDim;
  }

  update(delta: number) {
    this.onGround = false;
    this.baseUpdate(delta);
  }

  hit(entity: Entity, where: FaceLocater) {
    if (where.side === 1 && where.dir === 0) {
      this.onGround = true;
    }
  }
}
