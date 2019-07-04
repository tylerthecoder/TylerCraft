import { Entity, RenderType } from "./entity";
import { IDim } from "../../types";

export class Ball extends Entity {
  radius = 1;

  renderType = RenderType.SPHERE;

  constructor(public pos: IDim, public vel: IDim) {
    super();

    this.dim = Array(3).fill(this.radius, 0, 3) as IDim;
  }

  update(delta: number) {
    this.onGround = false;
    this.baseUpdate(delta);
  }
}
