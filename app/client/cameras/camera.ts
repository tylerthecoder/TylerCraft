import { Entity, FaceLocater } from "../../src/entities/entity";
import { IDim } from "../../types";
import { arrayDist, arrayMul } from "../../src/utils";
import { Vector3D } from "../../src/utils/vector";

export abstract class Camera extends Entity {
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

  // onClick(entities: Entity[]) {
  //   const ent = this.lookingAt(entities);

  //   return ent;
  // }

  // // TODO:
  // baseLookingAt(entities: Entity[]) {
  //   const closestEntityIndex = entities.
  //     map((entity, index) => ({ dist: arrayDist(this.pos.data, entity.pos.data), index, })).
  //     reduce((best, cur) => best.dist > cur.dist ? best : cur).index;

  //   return entities[closestEntityIndex];
  // }

  // lookingAt(entities: Entity[]) {
  //   return this.baseLookingAt(entities);
  // }

  abstract handleMouse(e: MouseEvent): void;
}
