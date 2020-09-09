import { Entity, FaceLocater } from "./entity";
import { IDim } from "../../types";
import { BLOCKS } from "../blockdata";
import { Vector3D } from "../utils/vector";

export class Cube extends Entity {
  gravitable = false;
  tangible = false;

  constructor(
    public type: BLOCKS,
    public pos: Vector3D,
    public dim: IDim = [1,1,1],
  ) {
    super();
  }

  update(delta: number) {
    if (Math.random() < 0.001) {
      this.gravitable = true;
      return true;
    }

    this.baseUpdate(delta);
  }

  hit(ent: Entity, where: FaceLocater) {}

  isPointInsideMe(point: IDim) {
    return this.pos.data.every((ord, index) => {
      return point[index] >= ord && point[index] <= ord + this.dim[index]
    });
  }
}
