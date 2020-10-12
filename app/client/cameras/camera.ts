import { Entity, FaceLocater } from "../../src/entities/entity";
import { IDim } from "../../types";
import { Vector3D } from "../../src/utils/vector";
import { MovableEntity } from "../../src/entities/moveableEntity";

export abstract class Camera extends MovableEntity {
  // (x, y, z)
  abstract pos: Vector3D;
  // (phi[0, pi], theata[0, pi], null)
  abstract rot: IDim;

  constructor() {
    super();
  }

  update(_delta: number) {/* NO-OP */}
  render(_camera: Camera) {/* NO-OP */}
  hit(_ent: Entity, _where: FaceLocater) {/* NO-OP */}

  abstract rotateBy(x: number, y: number): void;
}
