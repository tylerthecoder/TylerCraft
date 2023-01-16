import { Entity, FaceLocater } from "./entities/entity.js";
import { Vector3D } from "./utils/vector.js";
import { IDim } from "./types.js";

export interface ICameraData {
  pos: IDim;
  rotCart: IDim;
}

export interface CameraRay {
  pos: {x: number, y: number, z: number};
  rot: {theta: number, phi: number};
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

  getRay(): CameraRay {
    return {
      pos: {
        x: this.pos.get(0),
        y: this.pos.get(1),
        z: this.pos.get(2),
      },
      rot: {
        theta: this.rot.get(1),
        // Convert to [-pi/2, pi/2]
        phi: (Math.PI / 2) - this.rot.get(2),
      }
    };
  }


  update(_delta: number) {/* NO-OP */ }
  render(_camera: Camera) {/* NO-OP */ }
  hit(_ent: Entity, _where: FaceLocater) {/* NO-OP */ }

  abstract rotateBy(x: number, y: number): void;
}
