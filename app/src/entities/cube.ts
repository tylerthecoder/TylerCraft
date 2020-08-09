import { Entity, FaceLocater } from "./entity";
import { IDim } from "../../types";
import { BLOCK_TYPES } from "../blockdata";

export class Cube extends Entity {
  gravitable = false;
  tangible = false;

  constructor(
    public type: BLOCK_TYPES,
    public pos: IDim,
    public dim: IDim = [1,1,1],
  ) {
    super();
  }

  update(delta: number) {
    // if (Math.random() < 0.001) {
    //   this.falling = true;
    // }

    this.baseUpdate(delta);
  }

  hit(ent: Entity, where: FaceLocater) {}

  isPointInsideMe(point: IDim) {
    return this.pos.every((ord, index) => {
      return point[index] >= ord && point[index] <= ord + this.dim[index]
    });
  }
}
