import { IDim, IAction } from "../../types";
import { sphereToCartCords, arrayAdd, arrayMul, arrayCompare } from "../utils";
import { Player } from "./player";

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
  prevVel: IDim = [0,0,0]
  vel: IDim = [0, 0, 0];
  dim: IDim = [1, 1, 1];
  rot: IDim = [0, 0, 0];

  gravitable = true;
  tangible = true;

  prevMetaActions = new Set();
  metaActions = new Set();

  onGround = false;
  speed = 1;

  uid = "";

  jumpCount = 0;

  constructor() { }

  abstract update(delta: number): void;
  abstract hit(entity: Entity, where: FaceLocater): void;
  // abstract isPointInsideMe(point: IDim): boolean;


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
    // loop through each dimension. Consider each edge along that dimension a line segment
    // check to see if my (this) line segment overlaps the entities (ent) line segment
    for (let i = 0; i < 3; i++) {

      if (
        this.pos[i] < ent.pos[i] && // ent line is front
        ent.pos[i] > this.pos[i] + this.dim[i] // and ent is not contained in my (this) line segment
      ) {
        // not possible for these to be intersecting since one dimension is too far away
        return false
      }

      if (
        ent.pos[i] < this.pos[i] && // My (this) line is front
        this.pos[i] > ent.pos[i] + ent.dim[i] // and ent is not contained in my (this) line segment
      ) {
        // not possible for these to be intersecting since one dimension is too far away
        return false
      }

      // distance between one center and the other
      // const dist = Math.abs((this.pos[i] + this.dim[i] / 2) - (ent.pos[i] + ent.dim[i] /2));

      // if the distance is more than possible then break
      // if (dist > this.dim[i]/2 + ent.dim[i]/2) return false;
    }
    this.baseHit(ent);
    ent.baseHit(this);
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
        const p = this.pos[i] + this.dim[i] * dir;
        const c = ent.pos[i] + ent.dim[i] * switchDir(dir);
        const dist = Math.abs(c - p);
        // find the shortest distance (that is best one to move)
        if (dist < min[0]) {
          min = [dist, i, dir];
        }
      }
    }


    const [_, i, dir] = min;

    this.pos[i] = ent.pos[i] + ent.dim[i] * switchDir(dir) - this.dim[i] * dir;

    if (i !== 1) {
      // console.log(min, this.vel, this);
    }

    this.vel[i] = 0;

    return {
      side: i,
      dir: dir as 1 | -1
    };
  }

  jump() {
    if (this.jumpCount < 5) {
      this.vel[1] = 0.1;
      this.jumpCount++;
    }
  }

  getActions(): IAction[] {
    return [];
    // return this.getPlanerActionsFromMetaActions();
  }

  // Consumes some of the meta-action
  getPlanerActionsFromMetaActions() {
    let vel: IDim = [0, 0, 0];
    let cartVel: number[];
    const actions: IAction[] = [];

    if (this.prevMetaActions.size > 0 && this.metaActions.size === 0) {
      actions.push({
        setEntVel: {
          uid: this.uid,
          vel: [0,0,0]
        }
      });
    }
    this.prevMetaActions = new Set(this.metaActions);

    this.metaActions.forEach(metaAction => {
      const baseSpeed = 0.5;
      switch (metaAction) {
        case "forward":
          cartVel = sphereToCartCords(-baseSpeed, -this.rot[1], Math.PI / 2);
          vel = arrayAdd(vel, cartVel) as IDim;
          break;
        case "backward":
          cartVel = sphereToCartCords(baseSpeed, -this.rot[1], Math.PI / 2);
          vel = arrayAdd(vel, cartVel) as IDim;
          break;
        case "left":
          cartVel = sphereToCartCords(baseSpeed, -this.rot[1] - Math.PI / 2, Math.PI / 2);
          vel = arrayAdd(vel, cartVel) as IDim;
          break;
        case "right":
          cartVel = sphereToCartCords(baseSpeed, -this.rot[1] + Math.PI / 2, Math.PI / 2);
          vel = arrayAdd(vel, cartVel) as IDim;
          break;
        case "up":
          vel = arrayAdd(vel, [0, this.speed, 0]) as IDim;
          break;
        case "down":
          vel = arrayAdd(vel, [0, -this.speed, 0]) as IDim;
          break;
        case "jump":
          actions.push({
            playerJump: {
              uid: this.uid
            }
          });
      }
      vel = arrayMul(vel, [.2, .2, .2]) as IDim;
      const isDifferentVel = !arrayCompare(vel, this.prevVel)

      this.prevVel = vel.slice(0) as IDim;

      if (isDifferentVel) {
        actions.push({
          setEntVel: {
            vel,
            uid: this.uid
          }
        })
      }
    });
    return actions;
  }

  getUpDownActions() {
    const actions = [];

    this.metaActions.forEach(metaAction => {
      switch(metaAction) {
        case "up":

      }
    });
  }


}
