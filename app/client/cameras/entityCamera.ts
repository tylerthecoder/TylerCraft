import { Entity } from "../../src/entities/entity";
import { Camera } from "./camera";
import { IDim } from "../../types";
import { arrayAdd } from "../../src/utils";
import { CONFIG } from "../../src/constants";
import { Vector3D } from "../../src/utils/vector";

export class EntityCamera extends Camera {
  thirdPerson: boolean = false;

  offset: IDim = [0, 0, 0];
  rot: IDim;

  constructor(public entity: Entity) {
    super();
    this.rot = entity.rot.slice(0) as IDim;
  }

  handleMouse(e: MouseEvent) {
    const dx = e.movementX * CONFIG.player.rotSpeed;
    const dy = e.movementY * CONFIG.player.rotSpeed;
    this.entity.rotate([-dy, dx, 0]);

    // set my rot as my entities rot
    this.rot = this.entity.rot.slice(0) as IDim;
    this.rotCart = this.entity.rotCart;
  }

  // lookingAt(entities: Entity[]) {
  //   return this.baseLookingAt(entities.filter(entity => entity !== this.entity));
  // }

  get pos(): Vector3D {
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
    offset = arrayAdd(offset, [this.entity.dim[0] / 2, this.entity.dim[1] * (9/10), this.entity.dim[2] / 2]);

    return new Vector3D(arrayAdd(this.entity.pos.data, offset));
  }

  set pos(_pos: Vector3D) {}
}
