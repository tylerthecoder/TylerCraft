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

export abstract class Entity {
  renderType: RenderType;

  pos: Vector3D = new Vector3D([0,0,0]);
  prevVel: IDim = [0,0,0];
  vel: IDim = [0, 0, 0];
  dim: IDim = [1, 1, 1];
  rot: IDim = [0, 0, 0];
  // the cartesian form of the vector
  rotCart: Vector3D = new Vector3D(this.rot).toCartesianCoords();

  gravitable = true;
  tangible = true;

  prevMetaActions = new Set<MetaAction>();
  metaActions = new Set<MetaAction>();

  onGround = false;

  uid = "";

  jumpCount = 0;

  constructor() { }

  abstract update(delta: number): void;
  abstract hit(entity: Entity, where: FaceLocater): void;


  setUid(uid: string) {
    this.uid = uid;
  }

  baseUpdate(delta: number) {
    if (this.gravitable) this.gravity();
    arrayScalarMul(this.vel, delta / 16);
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
      this.pos.data[i] += p[i];
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

    // bound the rot to ([0, pi], [0, 2 * pi])
    if (this.rot[0] < 0) this.rot[0] = 0;
    if (this.rot[0] > Math.PI) this.rot[0] = Math.PI;
    if (this.rot[1] < 0) this.rot[1] = this.rot[1] + 2 * Math.PI;
    if (this.rot[1] > 2 * Math.PI) this.rot[1] = this.rot[1] - 2 * Math.PI;

    // idk where this equation comes from. Need to look into why this is
    this.rotCart = new Vector3D(arrayMul(sphereToCartCords(1, this.rot[1], this.rot[0]), [-1, 1, 1]))
  }

  gravity() {
    this.applyForce([0, CONFIG.gravity, 0]);
  }

  isCollide(ent: Entity) {
    // loop through each dimension. Consider each edge along that dimension a line segment
    // check to see if my (this) line segment overlaps the entities (ent) line segment
    for (let i = 0; i < 3; i++) {
      if (
        this.pos.get(i) < ent.pos.get(i) && // ent line is front
        ent.pos.get(i) > this.pos.get(i) + this.dim[i] // and ent is not contained in my (this) line segment
      ) {
        // not possible for these to be intersecting since one dimension is too far away
        return false
      }

      if (
        ent.pos.get(i) < this.pos.get(i) && // My (this) line is front
        this.pos.get(i) > ent.pos.get(i) + ent.dim[i] // and ent is not contained in my (this) line segment
      ) {
        // not possible for these to be intersecting since one dimension is too far away
        return false
      }

      // distance between one center and the other
      // const dist = Math.abs((this.pos[i] + this.dim[i] / 2) - (ent.pos[i] + ent.dim[i] /2));

      // if the distance is more than possible then break
      // if (dist > this.dim[i]/2 + ent.dim[i]/2) return false;
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

    this.pos.set(i, ent.pos.get(i) + ent.dim[i] * switchDir(dir) - this.dim[i] * dir);

    this.vel[i] = 0;

    return {
      side: i,
      dir: dir as 1 | 0
    };
  }

  jump() {
    if (this.jumpCount < 5) {
      this.vel[1] = CONFIG.player.jumpSpeed;
      this.jumpCount++;
    }
  }

  getActions(): IAction[] {
    return [];
  }

  // Consumes some of the meta-action
  getPlanerActionsFromMetaActions() {
    // include the vertical vel incase they are jumping
    let vel: IDim = [0, this.vel[1], 0];
    let cartVel: IDim;
    const actions: IAction[] = [];

    if (this.prevMetaActions.size > 0 && this.metaActions.size === 0) {
      actions.push({
        type: IActionType.setEntVel,
        setEntVel: {
          uid: this.uid,
          vel,
        }
      });
    }
    this.prevMetaActions = new Set(this.metaActions);

    let isMovingUp = false;

    this.metaActions.forEach(metaAction => {
      const baseSpeed = CONFIG.player.speed;
      switch (metaAction) {
        case MetaAction.forward:
          cartVel = sphereToCartCords(-baseSpeed, -this.rot[1], Math.PI / 2);
          vel = arrayAdd(vel, cartVel);
          break;
        case MetaAction.backward:
          cartVel = sphereToCartCords(baseSpeed, -this.rot[1], Math.PI / 2);
          vel = arrayAdd(vel, cartVel);
          break;
        case MetaAction.left:
          cartVel = sphereToCartCords(baseSpeed, -this.rot[1] - Math.PI / 2, Math.PI / 2);
          vel = arrayAdd(vel, cartVel);
          break;
        case MetaAction.right:
          cartVel = sphereToCartCords(baseSpeed, -this.rot[1] + Math.PI / 2, Math.PI / 2);
          vel = arrayAdd(vel, cartVel);
          break;
        case MetaAction.up:
          isMovingUp = true;
          vel[1] = baseSpeed;
          break;
        case MetaAction.down:
          isMovingUp = true;
          vel[1] = -baseSpeed;
          break;
        case MetaAction.jump:
          actions.push({
            type: IActionType.playerJump,
            playerJump: {
              uid: this.uid
            }
          });
          break;
        case MetaAction.fireball:
          actions.push({
            type: IActionType.playerFireball,
            playerFireball: {
              uid: this.uid
            }
          });
          break;
      }
      const isDifferentVel = !arrayCompare(vel, this.prevVel)

      this.prevVel = vel.slice(0) as IDim;

      if (isDifferentVel) {
        actions.push({
          type: IActionType.setEntVel,
          setEntVel: {
            vel,
            uid: this.uid
          }
        })
      }
    });

      // if we are a spectator and we aren't pressing anything, set vert vel to 0
      if (!isMovingUp && !this.gravitable) {
        vel[1] = 0;
      }
    return actions;
  }
}
