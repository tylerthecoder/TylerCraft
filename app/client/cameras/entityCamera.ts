import { Camera } from "../../src/camera";
import { Vector, Vector3D } from "../../src/utils/vector";
import { MovableEntity } from "../../src/entities/moveableEntity";
import { CONFIG } from "../../src/config";

export enum PlayerPerspective {
  FirstPerson,
  ThirdPersonBack,
  ThirdPersonFront,
}

export class EntityCamera extends Camera {
  private perspective = PlayerPerspective.FirstPerson;
  offset: Vector3D = Vector3D.zero;
  rot: Vector3D;

  constructor(public entity: MovableEntity) {
    super();
    this.rot = entity.rot.copy();
  }

  // cycles through player perspectives. Returns weather the player should be rendered or not
  public togglePerspective(): boolean {
    this.perspective =
      this.perspective === PlayerPerspective.FirstPerson ?
        PlayerPerspective.ThirdPersonBack :
        this.perspective === PlayerPerspective.ThirdPersonBack ?
          PlayerPerspective.ThirdPersonFront : PlayerPerspective.FirstPerson

    return this.perspective !== PlayerPerspective.FirstPerson;
  }

  rotateBy(x: number, y: number) {
    this.entity.rotate(new Vector3D([1, x, y]));
    // set my rot as my entities rot
    if (this.perspective === PlayerPerspective.ThirdPersonFront) {
      this.rot = this.entity.rot.add(new Vector3D([0, Math.PI, 0]));
      this.rotCart = this.rot.toCartesianCoords();
    } else {
      this.rot = this.entity.rot.copy();
      this.rotCart = this.entity.rotCart.copy();
    }
  }

  get pos(): Vector3D {
    let offset = Vector3D.zero;

    if (this.perspective === PlayerPerspective.ThirdPersonBack) {
      offset = this.entity.rot
        .add(
          new Vector3D([CONFIG.player.thirdPersonCamDist, 0, 0])
        )
        .toCartesianCoords()
        .multiply(
          new Vector3D([1, -1, 1])
        )
    } else if (this.perspective === PlayerPerspective.ThirdPersonFront) {
      this.rot = this.entity.rot.add(new Vector3D([0, Math.PI, 0]));
      offset = this.entity.rot
        .add(
          new Vector3D([CONFIG.player.thirdPersonCamDist, Math.PI, 0])
        )
        .toCartesianCoords()
        .multiply(
          new Vector3D([1, -1, 1])
        )
    } else {
      offset = this.offset;
    }

    offset = offset.add(new Vector3D([
      this.entity.dim[0] / 2,
      this.entity.dim[1] * (9 / 10),
      this.entity.dim[2] / 2
    ]));

    return offset.add(this.entity.pos);
  }

  set pos(_pos: Vector3D) {/* NO-OP */ }
}
