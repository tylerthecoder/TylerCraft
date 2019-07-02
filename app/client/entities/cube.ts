import { Entity } from "./entity";
import { Camera } from "../cameras/camera";
import { IDim } from "..";

export class Cube extends Entity {
  gravitable = false;

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

  render(camera: Camera) {}
}
