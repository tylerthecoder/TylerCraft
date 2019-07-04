import { Entity } from "../../src/entities/entity";
import { Camera } from "./camera";
import { IDim } from "../../types";

export class EntityCamera extends Camera {
  thirdPerson: boolean = false;

  offset: IDim = [0, 1, 0];

  constructor(public entity: Entity) {
    super();
  }

  handleMouse(e: MouseEvent) {
    const speed = 0.002;
    const dx = e.movementX * speed;
    const dy = e.movementY * speed;
    this.entity.rotate([-dy, dx, 0]);
  }

  get pos(): IDim {
    let offset: number[] = [];
    if (this.thirdPerson) {
      offset = [
        -Math.sin(this.entity.rot[1]) * 7,
        Math.cos(this.entity.rot[0]) * 7,
        Math.cos(this.entity.rot[1]) * 7
      ];
    } else {
      offset = this.offset;
    }

    return this.entity.pos.map((x, i) => x + offset[i]).slice(0) as IDim;
  }

  set pos(_pos: IDim) {}

  get rot() {
    const rot = this.entity.rot.slice(0);
    return rot as IDim;
  }
  set rot(_pos: IDim) {}
}
