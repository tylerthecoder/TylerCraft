import { IDim, IAction, IActionType } from "../../types";
import { sphereToCartCords, arrayAdd, arrayMul, arrayCompare, arrayScalarMul } from "../utils";
import { CONFIG } from "../constants";
import { Vector3D } from "../utils/vector";

export enum RenderType {
  CUBE,
  SPHERE
}

export interface FaceLocater {
  side: number;
  dir: 1 | 0;
}

export enum MetaAction {
  right,
  left,
  forward,
  backward,
  up,
  down,
  jump,
  fireball,
}

export interface IEntityData {
  uid: string;
  pos: IDim;
  vel?: IDim;
  type: "projectile";
}

export abstract class Entity {
  pos: Vector3D = new Vector3D([0,0,0]);
  dim: IDim = [1, 1, 1];
  uid = "";

  constructor() { }

  public serialize(): IEntityData {
    return {
      uid: this.uid,
      pos: this.pos.data as IDim,
      // change this when we have another entity type that we need to send
      type: "projectile",
    }
  }

  abstract update(delta: number): void;
  abstract hit(entity: Entity, where: FaceLocater): void;


  setUid(uid: string) {
    this.uid = uid;
  }

  isCollide(ent: Entity) {
    // loop through each dimension. Consider each edge along that dimension a line segment
    // check to see if my (this) line segment overlaps the entities (ent) line segment
    for (let i = 0; i < 3; i++) {
      if (
        this.pos.get(i) <= ent.pos.get(i) && // ent line is front
        ent.pos.get(i) >= this.pos.get(i) + this.dim[i] // and ent is not contained in my (this) line segment
      ) {
        // not possible for these to be intersecting since one dimension is too far away
        return false
      }

      if (
        ent.pos.get(i) <= this.pos.get(i) && // My (this) line is front
        this.pos.get(i) >= ent.pos.get(i) + ent.dim[i] // and ent is not contained in my (this) line segment
      ) {
        // not possible for these to be intersecting since one dimension is too far away
        return false
      }
    }
    return true;
  }

  // push me (this) out of the supplied entity (ent)
  pushOut(ent: Entity): FaceLocater {
    let min = [Infinity];

    // 0 -> 1, 1 -> 0
    const switchDir = (dir: number) => (dir+1) % 2;

    for (let i = 0; i < 3; i++) {
      for (let dir = 0; dir <= 1; dir ++) {
        // calculate the distance from a face on the player to a face on the ent
        const p = this.pos.get(i) + this.dim[i] * dir;
        const c = ent.pos.get(i) + ent.dim[i] * switchDir(dir);
        const dist = Math.abs(c - p);
        // find the shortest distance (that is best one to move)
        if (dist < min[0]) {
          min = [dist, i, dir];
        }
      }
    }

    const [_, i, dir] = min;

    const newPos = ent.pos.get(i) + ent.dim[i] * switchDir(dir) - this.dim[i] * dir;

    this.pos.set(i, newPos);

    this.hit(ent, {
      side: i,
      dir: dir as 0 | 1,
    });
    ent.hit(this, {
      side: i,
      dir: dir as 0 | 1,
    })

    return {
      side: i,
      dir: dir as 1 | 0
    };
  }

  getActions(): IAction[] {
    return [];
  }
}
