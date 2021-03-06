import { Entity, FaceLocater } from "./entity";
import { IDim } from "../types";
import { BLOCKS } from "../blockdata";
import { Vector3D } from "../utils/vector";

export class Cube extends Entity {

  constructor(
    public type: BLOCKS,
    public pos: Vector3D,
  ) {
    super();
  }

  update(_delta: number) {/* NO_OP */ }

  hit(_ent: Entity, _where: FaceLocater) {/* NO-OP */ }

  isPointInsideMe(point: IDim) {
    return this.pos.data.every((ord, index) => {
      return point[index] >= ord && point[index] <= ord + this.dim[index]
    });
  }
}
