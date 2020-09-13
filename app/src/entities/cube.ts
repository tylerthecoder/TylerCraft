import { Entity, FaceLocater } from "./entity";
import { IDim } from "../../types";
import { BLOCKS } from "../blockdata";
import { Vector3D } from "../utils/vector";

export class Cube extends Entity {

  constructor(
    public type: BLOCKS,
    public pos: Vector3D,
  ) {
    super();
  }

  update(delta: number) {
    // this.baseUpdate(delta);
  }

  hit(ent: Entity, where: FaceLocater) {}

  isPointInsideMe(point: IDim) {
    return this.pos.data.every((ord, index) => {
      return point[index] >= ord && point[index] <= ord + this.dim[index]
    });
  }
}
