import { Entity, FaceLocater } from "./entity";
import { IDim } from "../../types";

export class Cube extends Entity {
  gravitable = false;
  tangible = false;

  constructor(pos: IDim, dim?: IDim) {
    super();
    this.pos = pos;
    this.dim = dim || [1, 1, 1];
  }

  update(delta: number) {
    // if (Math.random() < 0.001) {
    //   this.falling = true;
    // }

    this.baseUpdate(delta);
  }

  hit(ent: Entity, where: FaceLocater) {}
}
