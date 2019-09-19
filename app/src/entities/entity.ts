import { IDim } from "../../types";

export enum RenderType {
  CUBE,
  SPHERE
}

export interface FaceLocater {
  side: number;
  dir: 1 | -1;
}

export abstract class Entity {
  renderType: RenderType;

  pos: IDim = [0, 0, 0];
  vel: IDim = [0, 0, 0];
  dim: IDim = [1, 1, 1];
  rot: IDim = [0, 0, 0];

  gravitable = true;
  tangible = true;

  onGround = false;
  speed = 1;

  uid = "";

  constructor() {}

  abstract update(delta: number): void;
  abstract hit(entity: Entity, where: FaceLocater): void;

  setUid(uid: string) {
    this.uid = uid;
  }

  baseUpdate(delta: number) {
    if (this.gravitable) this.gravity();

    this.move(this.vel);
  }

  baseHit(entity: Entity) {
    if (this.tangible) {
      const where = this.pushOut(entity);
      this.hit(entity, where);
    }
  }

  move(p: IDim) {
    for (let i = 0; i < p.length; i++) {
      this.pos[i] += p[i];
    }
  }

  applyForce(f: IDim) {
    for (let i = 0; i < f.length; i++) {
      this.vel[i] += f[i];
    }
  }

  rotate(r: number[]) {
    for (let i = 0; i < r.length; i++) {
      this.rot[i] += r[i];
    }
    if (this.rot[0] < 0) this.rot[0] = 0;
    if (this.rot[0] > Math.PI) this.rot[0] = Math.PI;
  }

  gravity() {
    this.applyForce([0, -0.007, 0]);
  }

  isCollide(ent: Entity) {
    for (let i = 0; i < 3; i++) {
      if (
        !(Math.abs(this.pos[i] - ent.pos[i]) < this.dim[i] / 2 + ent.dim[i] / 2)
      ) {
        return false;
      }
    }
    this.baseHit(ent);
    ent.baseHit(this);
    return true;
  }

  pushOut(ent: Entity): FaceLocater {
    let min = [Infinity];

    for (let i = 0; i < 3; i++) {
      for (let dir = -1; dir <= 1; dir += 2) {
        // calculate the distance from a face on the player to a face on the ent
        const p = this.pos[i] + (this.dim[i] / 2) * dir;
        const c = ent.pos[i] + (ent.dim[i] / 2) * -1 * dir;
        const dist = c - p;
        // find the shortest distance (that is best one to move)
        if (Math.abs(dist) < Math.abs(min[0])) {
          min = [dist, i, dir];
        }
      }
    }

    const [_, i, dir] = min;

    this.pos[i] = ent.pos[i] + (ent.dim[i] / 2 + this.dim[i] / 2) * -dir;

    this.vel[i] = 0;

    return {
      side: i,
      dir: dir as 1 | -1
    };
  }
}
