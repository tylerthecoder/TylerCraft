import { Entity, FaceLocater } from "../../src/entities/entity";
import { Vector3D } from "../../src/utils/vector";
import { MovableEntity } from "../../src/entities/moveableEntity";

export abstract class Camera extends MovableEntity {
  // (x, y, z)
  abstract pos: Vector3D;
  // (dist, theta: [0, 2pi], phi: [0, pi])
  abstract rot: Vector3D;

  constructor() {
    super();
  }

  update(_delta: number) {/* NO-OP */}
  render(_camera: Camera) {/* NO-OP */}
  hit(_ent: Entity, _where: FaceLocater) {/* NO-OP */}

  abstract rotateBy(x: number, y: number): void;
}
