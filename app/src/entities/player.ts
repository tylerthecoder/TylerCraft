import { Entity, FaceLocater, IEntity } from "./entity";
import { arrayAdd, arrayScalarMul } from "../utils";
import { IDim } from "../types";
import { MovableEntity, MovableEntityDto } from "./moveableEntity";
import { CONFIG } from "../config";
import { Direction, Vector3D } from "../utils/vector";
import { IEntityType } from "./entityHolder";

export interface PlayerDto extends MovableEntityDto {
  type: IEntityType.Player;
  health: {
    current: number;
    max: number;
  }
}


// A controller / PlayerHandler will append actions to Player
export class Player extends MovableEntity<PlayerDto> implements IEntity {
  // abstract values
  static readonly type = IEntityType.Player;
  get type() { return Player.type; }

  // Entity overrides
  pos: Vector3D = new Vector3D([0, 50, 0]);
  dim: IDim = [.8, 2, .8];
  rot = new Vector3D([0, 0, Math.PI / 2]);

  // Player Member Variables
  thirdPerson = false;
  onGround = false;
  jumpCount = 0;
  distanceMoved = 0; // used for animating the arms and legs. Reset to zero when not moving

  leftHandPosition = new Vector3D([1, 1, 0]);
  rightHandPosition = new Vector3D([1, 1, 1]);

  health = {
    current: 100,
    max: 100,
  }

  fire = {
    count: 0,
    holding: false,
    coolDown: 10,
  }

  creative = false;

  moveDirections: Direction[] = [];

  static create(id: string): Player {
    return new Player({
      uid: id,
    });
  }

  getDto(): PlayerDto {
    return {
      ...this.baseDto(),
      type: IEntityType.Player,
      health: this.health,
    }
  }

  set(player: Partial<PlayerDto>) {
    super.baseSet(player);
    if (player.health) {
      this.health = player.health;
    }
  }

  moveInDirections() {
    const baseSpeed = CONFIG.player.speed;

    const moveDirection = (direction: Direction) => {
      switch (direction) {
        case Direction.Forwards:
          return new Vector3D([
            -baseSpeed, this.rot.get(1), Math.PI / 2,
          ]).toCartesianCoords()
            .set(1, 0)
        case Direction.Backwards:
          return new Vector3D([
            baseSpeed, this.rot.get(1), Math.PI / 2,
          ]).toCartesianCoords()
            .set(1, 0);
        case Direction.Left:
          return new Vector3D([
            baseSpeed, this.rot.get(1) + Math.PI / 2, Math.PI / 2
          ]).toCartesianCoords()
            .set(1, 0);
        case Direction.Right:
          return new Vector3D([
            baseSpeed, this.rot.get(1) - Math.PI / 2, Math.PI / 2
          ]).toCartesianCoords()
            .set(1, 0);
        case Direction.Up:
          if (this.creative) {
            return new Vector3D([0, baseSpeed, 0]);
          } else {
            return Vector3D.zero;
          }
        case Direction.Down:
          if (this.creative) {
            return new Vector3D([0, -baseSpeed, 0]);
          } else {
            return Vector3D.zero;
          }
      }
    }

    let newVel = Vector3D.zero;
    for (const dir of this.moveDirections) {
      const vel = moveDirection(dir);
      newVel = newVel.add(vel);
    }

    // If we don't have a y comp then use the current one
    if (newVel.get(1) === 0) {
      newVel.set(1, this.vel.get(1));
    }

    this.vel = newVel;
  }

  tryJump() {
    if (this.onGround) {
      this.vel.set(1, CONFIG.player.jumpSpeed);
    }
  }

  setCreative(val: boolean) {
    this.creative = val;
    this.gravitable = !val;
  }

  hurt(amount: number) {
    this.health.current -= amount;
  }

  update(delta: number) {
    this.moveInDirections();

    this.onGround = false;
    if (this.fire.count > 0 && !this.fire.holding) this.fire.count--;

    const moveDist = Math.abs(this.vel.get(0)) + Math.abs(this.vel.get(2));

    if (moveDist > 0) {
      this.distanceMoved += moveDist;
    } else {
      this.distanceMoved = 0;
    }

    this.baseUpdate(delta);

    if (this.pos.get(1) < -10) {
      this.pos.set(1, 0);
      this.vel.set(1, -.1);
    }

  }

  hit(_entity: Entity, where: FaceLocater) {
    this.vel.set(where.side, 0);
    if (where.side === 1 && where.dir === 0) {
      this.onGround = true;
      this.jumpCount = 0;
    }
  }

  fireball() {
    if (this.fire.count > 0) return;

    const vel = this.rotCart.scalarMultiply(-.4).data as IDim;
    const pos = arrayAdd(arrayAdd(this.pos.data, arrayScalarMul(vel, 4)), [.5, 2, .5]) as IDim;
    // const ball = new Projectile(new Vector3D(pos), new Vector3D(vel));

    // this.actions.push({
    //   type: IActionType.addEntity,
    //   payload: {
    //     ent: ball.serialize(IEntityType.Projectile),
    //   }
    // });

    this.fire.count = this.fire.coolDown;
  }
}
