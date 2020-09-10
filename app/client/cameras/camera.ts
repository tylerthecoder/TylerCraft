import { Entity, FaceLocater } from "../../src/entities/entity";
import { IDim } from "../../types";
import { arrayDist, arrayMul } from "../../src/utils";
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

  update(_delta: number) {}
  render(_camera: Camera) {}
  hit(ent: Entity, where: FaceLocater) {}

  abstract handleMouse(e: MouseEvent): void;
}
