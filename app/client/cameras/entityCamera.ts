import { Entity } from "../../src/entities/entity";
import { Camera } from "./camera";
import { IDim } from "../../types";
import { arrayAdd } from "../../src/utils";

export class EntityCamera extends Camera {
  thirdPerson: boolean = false;

  offset: IDim = [0, 0, 0];

  constructor(public entity: Entity) {
    super();
  }

  handleMouse(e: MouseEvent) {
    const speed = 0.002;
    const dx = e.movementX * speed;
    const dy = e.movementY * speed;
    this.entity.rotate([-dy, dx, 0]);
  }

  lookingAt(entities: Entity[]) {
    return this.baseLookingAt(entities.filter(entity => entity !== this.entity));
  }

  get pos(): IDim {
    let offset: number[] = [];
    if (this.thirdPerson) {
      // offset = [
      //   -Math.sin(this.entity.rot[1]) * 7,
      //   Math.cos(this.entity.rot[0]) * 7 + 2,
      //   Math.cos(this.entity.rot[1]) * 7
      // ];
      offset = [
        2, 3, 2
      ];
    } else {
      offset = this.offset;
    }

    // center the camera position
    offset = arrayAdd(offset, [this.entity.dim[0] / 2, this.entity.dim[1] * (4/5), this.entity.dim[2] / 2]);

    return arrayAdd(this.entity.pos, offset) as IDim;
  }

  set pos(_pos: IDim) {}

  get rot() {
    const rot = this.entity.rot.slice(0);
    return rot as IDim;
  }
  set rot(_pos: IDim) {}
}
