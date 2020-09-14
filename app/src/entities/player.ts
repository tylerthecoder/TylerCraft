import { Entity, FaceLocater, MetaAction } from "./entity";
import { arrayAdd, arrayScalarMul} from "../utils";
import { IDim, IAction, IActionType } from "../../types";
import { Vector, Vector3D } from "../utils/vector";
import { Projectile } from "./projectile";
import { MovableEntity } from "./moveableEntity";
import { CONFIG } from "../constants";

export class Player extends MovableEntity {
  // Entity overrides
  pos: Vector3D = new Vector3D([0, 10, 0]);
  dim: IDim = [.8, 2, .8];

  // Player Member Variables
  thirdPerson = false;
  onGround = false;
  jumpCount = 0;

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

  constructor(public isReal: boolean) {
    super();

    this.setCreative(false);
  }

  getActions(): IAction[] {
    if (!this.isReal) return [];
    const actions = this.actions

    const addMoveAction = (vel: Vector3D) => {
      actions.push({
        type: IActionType.setEntVel,
        setEntVel: {
          vel: vel.data as IDim,
          uid: this.uid,
        }
      });
    }

    const totVel = this.getWasdVel();

    if (this.creative) {
      totVel.addTo(this.getVerticalVel());
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
    return actions;
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
    const pos = arrayAdd(arrayAdd(this.pos.data, arrayScalarMul(vel, 4)), [.5,2,.5]) as IDim;
    const ball = new Projectile(new Vector(pos), new Vector(vel));

    this.actions.push({
      type: IActionType.addEntity,
      addEntity: {
        ent: ball.serialize(),
      }
    });

    this.fire.count = this.fire.coolDown;
  }
}
