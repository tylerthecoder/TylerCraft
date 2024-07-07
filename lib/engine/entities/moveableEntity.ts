import { IDim } from "../types.js";
import { bindValue } from "../utils.js";
import { Vector3D } from "../utils/vector.js";
import { Entity, EntityDto, MetaAction } from "./entity.js";

export interface MovableEntityDto extends EntityDto {
  vel: IDim;
}
export interface CameraRay {
  pos: { x: number; y: number; z: number };
  rot: { theta: number; phi: number };
}

export abstract class MovableEntity<
  T extends MovableEntityDto = MovableEntityDto
> extends Entity<T> {
  vel = Vector3D.zero;
  /**
   * (radius (1), theta: [0, 2pi], phi: [0, pi])
   */
  rot = Vector3D.zero;

  onGround = false;
  jumpCount = 0;

  metaActions = new Set<MetaAction>();

  protected baseDto(): MovableEntityDto {
    return {
      ...super.baseDto(),
      vel: this.vel.data as IDim,
    };
  }

  protected baseSet(data: Partial<MovableEntityDto>) {
    console.log("baseSet ent", this, data);
    super.baseSet(data);
    if (data.vel) {
      this.vel = new Vector3D(data.vel);
    }
  }

  rotate(r: Vector3D) {
    this.rot = this.rot.add(r);

    // bound the rot to ([0, pi], [0, 2 * pi])
    this.rot.set(0, 1);
    this.rot.set(1, bindValue(this.rot.get(1), 0, 2 * Math.PI, true));
    this.rot.set(2, bindValue(this.rot.get(2), 0, Math.PI));
  }

  getRay(): CameraRay {
    const eyePos = this.pos.add(
      new Vector3D([this.dim[0] / 2, this.dim[1] * (9 / 10), this.dim[2] / 2])
    );

    return {
      pos: {
        x: eyePos.get(0),
        y: eyePos.get(1),
        z: eyePos.get(2),
      },
      rot: {
        theta: -this.rot.get(1) + (Math.PI * 3) / 2,
        // Convert to [-pi/2, pi/2]
        phi: -(Math.PI / 2 - this.rot.get(2)),
      },
    };
  }
}
