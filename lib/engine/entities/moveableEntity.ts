import { IDim } from "../types.js";
import { CONFIG } from "../config.js";
import { bindValue } from "../utils.js";
import { Vector3D } from "../utils/vector.js";
import { Entity, EntityDto, MetaAction } from "./entity.js";
import { Game } from "../game.js";

export interface MovableEntityDto extends EntityDto {
  vel: IDim;
}

export abstract class MovableEntity<
  T extends MovableEntityDto = MovableEntityDto
> extends Entity<T> {
  vel = Vector3D.zero;
  /**
   * (radius (1), theta: [0, 2pi], phi: [0, pi])
   */
  rot = Vector3D.zero;
  rotCart: Vector3D = this.rot.toCartesianCoords();

  onGround = false;
  gravitable = true;
  jumpCount = 0;

  metaActions = new Set<MetaAction>();

  protected baseDto(): MovableEntityDto {
    return {
      ...super.baseDto(),
      vel: this.vel.data as IDim,
    };
  }

  protected baseSet(data: Partial<MovableEntityDto>) {
    super.baseSet(data);
    if (data.vel) {
      this.vel = new Vector3D(data.vel);
    }
  }

  baseUpdate(delta: number) {
    if (this.gravitable && !this.onGround) this.gravity();

    // if we leave the tab for a long time delta gets very big.
    // idk if this is the best solution but I'm going to make them stop moving
    const scaleFactor = delta > 10000 ? 0 : delta / 16;
    const scaledVel = this.vel.scalarMultiply(scaleFactor);

    this.pos = this.pos.add(scaledVel);
  }

  baseHit(game: Game, entity: Entity) {
    const where = this.pushOut(game, entity);
    this.hit(game, entity, where);
  }

  private static gravityVector = new Vector3D([0, CONFIG.gravity, 0]);
  gravity() {
    if (this.vel.magnitude() > 0.9) return; // set a terminal velocity
    this.vel = this.vel.add(MovableEntity.gravityVector);
  }

  rotate(r: Vector3D) {
    this.rot = this.rot.add(r);

    // bound the rot to ([0, pi], [0, 2 * pi])
    this.rot.set(0, 1);
    this.rot.set(1, bindValue(this.rot.get(1), 0, 2 * Math.PI, true));
    this.rot.set(2, bindValue(this.rot.get(2), 0, Math.PI));

    // idk where this equation comes from. Need to look into why this is
    this.rotCart = this.rot.toCartesianCoords();
  }

  getJumpVel(): Vector3D {
    if (this.metaActions.has(MetaAction.jump)) {
      return new Vector3D([0, CONFIG.player.jumpSpeed, 0]);
    }
    return Vector3D.zero;
  }
}
