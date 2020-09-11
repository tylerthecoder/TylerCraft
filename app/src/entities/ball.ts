import { Entity, RenderType, FaceLocater } from "./entity";
import { IDim } from "../../types";
import { Vector3D } from "../utils/vector";
import { MovableEntity } from "./moveableEntity";

export class Ball extends MovableEntity {
  radius = 1;

  constructor(
    public pos: Vector3D, public vel: Vector3D
  ) {
    super();

    this.dim = Array(3).fill(this.radius, 0, 3) as IDim;
  }

  update(delta: number) {
    this.onGround = false;
    this.baseUpdate(delta);
  }

  hit(_entity: Entity, where: FaceLocater) {
    this.vel.set(where.side, 0);
    if (where.side === 1 && where.dir === 0) {
      this.onGround = true;
    }
  }
}
