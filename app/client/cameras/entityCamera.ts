import { Camera } from "./camera";
import { Vector, Vector3D } from "../../src/utils/vector";
import { MovableEntity } from "../../src/entities/moveableEntity";
import { CONFIG } from "../../src/constants";

export class EntityCamera extends Camera {
  thirdPerson = false;
  offset: Vector3D = Vector.zero3D;
  rot: Vector3D;

  constructor(public entity: MovableEntity) {
    super();
    this.rot = entity.rot.copy();
  }

  rotateBy(x: number, y: number) {
    this.entity.rotate(new Vector([1, x, y]));
    // set my rot as my entities rot
    this.rot = this.entity.rot.copy();
    this.rotCart = this.entity.rotCart.copy();
  }

  get pos(): Vector3D {
    let offset = Vector.zero3D;

    if (this.thirdPerson) {
      // A vector to represent the sphere rotation of the entity
      offset = this.entity.rot
        .add(
          new Vector3D([CONFIG.player.thirdPersonCamDist, 0, 0])
        )
        .toCartesianCoords()
        .multiply(
          new Vector3D([1,-1,1])
        )

    // First Person
    } else {
      offset = this.offset;
    }

    offset = offset.add(new Vector3D([
      this.entity.dim[0] / 2,
      this.entity.dim[1] * (9/10),
      this.entity.dim[2] / 2
    ]));

    return offset.add(this.entity.pos);
  }

  set pos(_pos: Vector3D) {/* NO-OP */}
}
