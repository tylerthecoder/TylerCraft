import { Entity, FaceLocater } from "../../src/entities/entity";
import { canvas } from "../canvas";
import { IDim } from "../../types";
import { arrayDist } from "../../src/utils";
import { Cube } from "../../src/entities/cube";

export abstract class Camera extends Entity {
  // x y and z
  abstract pos: IDim;
  // theta[0, 2pi], phi[0, pi], null
  abstract rot: IDim;

  constructor() {
    super();
  }

  update(_delta: number) {}
  render(_camera: Camera) {}
  hit(ent: Entity, where: FaceLocater) {}

  onClick(entities: Entity[]) {
    const ent = this.lookingAt(entities);


    console.log(ent);

    return ent;
  }

  // TODO:
  // actually implement better logic than this
  baseLookingAt(entities: Entity[]) {
    const closestEntityIndex = entities.
      map((entity, index) => ({ dist: arrayDist(this.pos, entity.pos), index, })).
      reduce((best, cur) => best.dist > cur.dist ? best : cur).index;

    return entities[closestEntityIndex];
  }

  lookingAt(entities: Entity[]) {
    return this.baseLookingAt(entities);
  }

  abstract handleMouse(e: MouseEvent): void;
}
