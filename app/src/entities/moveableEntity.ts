import { IDim } from "../../types";
import { CONFIG } from "../constants";
import { arrayAdd, arrayMul, sphereToCartCords } from "../utils";
import { Vector, Vector3D } from "../utils/vector";
import { Entity, MetaAction, IEntityData } from "./entity";


export abstract class MovableEntity extends Entity {
  vel = Vector.zero3D;
  rot: IDim = [0, 0, 0];
  rotCart: Vector3D = new Vector3D(this.rot).toCartesianCoords();

  onGround = false;
  gravitable = true;
  jumpCount = 0;

  public serialize(): IEntityData {
    return {
      uid: this.uid,
      pos: this.pos.data as IDim,
      vel: this.vel.data as IDim,
      // change this when we have another entity type that we need to send
      type: "projectile",
    }
  }

  baseUpdate(delta: number) {
    if (this.gravitable) this.gravity();

    this.pos.addTo(this.vel.scalarMultiply(delta / 16));
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

  static gravityVector = new Vector3D([0, CONFIG.gravity, 0]);
  gravity() {
    this.vel.addTo(MovableEntity.gravityVector);
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

  getWasdVel() {
    for (const metaAction of this.metaActions) {
      const baseSpeed = CONFIG.player.speed;
      switch (metaAction) {
        case MetaAction.forward:
          return new Vector3D([
            -baseSpeed, -this.rot[1], Math.PI / 2
          ]).toCartesianCoords();
        case MetaAction.backward:
          return new Vector3D([
            baseSpeed, -this.rot[1], Math.PI / 2
          ]).toCartesianCoords();
        case MetaAction.left:
          return new Vector3D([
            baseSpeed, -this.rot[1] - Math.PI / 2, Math.PI / 2
          ]).toCartesianCoords();
        case MetaAction.right:
          return new Vector3D([
            baseSpeed, -this.rot[1] + Math.PI / 2, Math.PI / 2
          ]).toCartesianCoords();
      }
    }
    return new Vector3D([0,0,0]);
  }

  getVerticalVel() {
    for (const metaAction of this.metaActions) {
      const baseSpeed = CONFIG.player.speed;
      switch (metaAction) {
        case MetaAction.up:
          return new Vector3D([0,baseSpeed, 0]);
        case MetaAction.down:
          return new Vector3D([0,-baseSpeed, 0]);
      }
    }

    return new Vector3D([0,0,0]);
  }

  getJumpVel(): Vector3D {
    if (this.metaActions.has(MetaAction.jump)) {
      return new Vector3D([
        0,
        CONFIG.player.jumpSpeed,
        0
      ]);
    }
    return Vector.zero3D;
  }

}