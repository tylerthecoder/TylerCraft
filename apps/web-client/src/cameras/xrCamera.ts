import { Camera, Entity, Vector3D } from "@craft/engine";

export class XrCamera extends Camera {
  constructor(public entity: Entity) {
    super();
  }

  get rot() {
    return Vector3D.zero;
  }
  set rot(_pos: Vector3D) {
    /* NO-OP */
  }

  rotateBy(_x: number, _y: number) {
    //NO-OP
  }

  get pos() {
    const offset = new Vector3D([
      this.entity.dim[0] / 2,
      this.entity.dim[1] * (9 / 10),
      this.entity.dim[2] / 2,
    ]);

    return this.entity.pos.add(offset);
  }
  set pos(_pos: Vector3D) {
    /* NO-OP */
  }
}
