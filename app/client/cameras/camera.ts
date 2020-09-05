import { Entity, FaceLocater } from "../../src/entities/entity";
import { canvas } from "../canvas";
import { IDim } from "../../types";
import { arrayDist, arrayMul } from "../../src/utils";
import { Cube } from "../../src/entities/cube";
import {sphereToCartCords, normalize} from "../../src/utils";

export abstract class Camera extends Entity {
  // (x, y, z)
  abstract pos: IDim;
  // (phi[0, pi], theata[0, pi], null)
  abstract rot: IDim;

  constructor() {
    super();
  }

  update(_delta: number) {}
  render(_camera: Camera) {}
  hit(ent: Entity, where: FaceLocater) {}

  onClick(entities: Entity[]) {
    const ent = this.lookingAt(entities);


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
