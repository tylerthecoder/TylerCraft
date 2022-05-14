import { Entity, FaceLocater, IEntityType, ISerializedEntity, MetaAction } from "./entity";
import { arrayAdd, arrayScalarMul } from "../utils";
import { IDim, IAction } from "../types";
import { Vector, Vector2D, Vector3D } from "../utils/vector";
import { Projectile } from "./projectile";
import { MovableEntity } from "./moveableEntity";
import { CONFIG } from "../config";
import { BLOCKS, ExtraBlockData } from "../blockdata";


export interface ISerializedPlayer extends ISerializedEntity {
  vel: IDim;
  isReal: boolean;
}

// A controller / PlayerHandler will append actions to Player
export class Player extends MovableEntity {
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

  actions: IAction[] = [];

  fire = {
    count: 0,
    holding: false,
    coolDown: 10,
  }

  creative = false;

  constructor(
    /** Means that the player is controlled by the current user */
    public isReal: boolean,
    uid?: string
  ) {
    super();
    this.setCreative(false);
    if (uid) {
      this.uid = uid;
    }
  }

  serialize(type: IEntityType): ISerializedPlayer {
    return {
      uid: this.uid,
      pos: this.pos.data as IDim,
      vel: this.vel.data as IDim,
      isReal: this.isReal,
      type: type,
    }
  }

  static deserialize(data: ISerializedPlayer): Player {
    const player = new Player(data.isReal);
    player.pos = new Vector3D(data.pos);
    player.vel = new Vector3D(data.vel);
    player.uid = data.uid;
    player.isReal = data.isReal;
    return player;
  }

  getActions(): IAction[] {
    if (!this.isReal) return [];
    const actions = this.actions;

    const addMoveAction = (vel: Vector3D) => {
      actions.push({
        type: .setEntVel,
        payload: {
          vel: vel.data as IDim,
          uid: this.uid,
        }
      });
    }

    let totVel = this.getWasdVel();

    if (this.creative) {
      totVel = totVel.add(this.getVerticalVel());
      if (!totVel.equals(this.vel)) {
        addMoveAction(totVel);
      }
    } else {
      if (this.metaActions.has(MetaAction.jump) && this.onGround) {
        totVel.set(1, CONFIG.player.jumpSpeed);
        addMoveAction(totVel);
      } else {
        totVel.set(1, this.vel.get(1));
        if (!totVel.equals(this.vel)) {
          addMoveAction(totVel);
        }
      }
    }

    this.actions = [];

    // this.metaActions.clear();

    return actions;
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
    this.onGround = false;
    if (this.fire.count > 0 && !this.fire.holding) this.fire.count--;

    const moveDist = Math.abs(this.vel.get(0)) + Math.abs(this.vel.get(2));

    if (moveDist > 0) {
      this.distanceMoved += moveDist;
    } else {
      this.distanceMoved = 0;
    }

    this.baseUpdate(delta);
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
    const ball = new Projectile(new Vector3D(pos), new Vector3D(vel));

    this.actions.push({
      type: IActionType.addEntity,
      payload: {
        ent: ball.serialize(IEntityType.Projectile),
      }
    });

    this.fire.count = this.fire.coolDown;
  }
}
