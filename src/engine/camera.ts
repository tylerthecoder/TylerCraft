import { Entity, FaceLocater } from "./entities/entity.js";
import { Vector3D } from "./utils/vector.js";
import { IDim } from "./types.js";

export interface ICameraData {
  pos: IDim;
  rotCart: IDim;
}

export abstract class Camera {
  // (x, y, z)
  abstract pos: Vector3D;
  // (dist, theta: [0, 2pi], phi: [0, pi])
  abstract rot: Vector3D;

  getCameraData(): ICameraData {
    return {
      pos: this.pos.data as IDim,
      rotCart: this.rot.toCartesianCoords().data as IDim,
    };
  }


  update(_delta: number) {/* NO-OP */ }
  render(_camera: Camera) {/* NO-OP */ }
  hit(_ent: Entity, _where: FaceLocater) {/* NO-OP */ }

  abstract rotateBy(x: number, y: number): void;
}
