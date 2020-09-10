import { Entity, RenderType, FaceLocater, MetaAction } from "./entity";
import { arrayAdd, arrayScalarMul} from "../utils";
import { Game } from "../game";
import { IDim, IAction, IActionType } from "../../types";
import { Vector, Vector3D } from "../utils/vector";
import { Projectile } from "./projectile";
import { MovableEntity } from "./moveableEntity";

export class Player extends MovableEntity {
  // Entity overrides
  pos: Vector3D = new Vector3D([0, 5, 0]);
  dim: IDim = [1, 2, 1];
  rot: IDim = [0, 0, 0];
  renderType = RenderType.CUBE;

  // Player Member Variables
  thirdPerson = false;
  onGround = false;

  jumpCount = 0;

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
    const actions = this.actions

    const totVel = this.getWasdVel();

    if (this.creative) {
      totVel.addTo(this.getVerticalVel());
    } else {
      totVel.set(1, this.vel[1]);
      const jumpAction = this.getJumpAction();
      if (jumpAction) {
        this.actions.push(jumpAction);
      }
    }

    if (!totVel.equals(new Vector(this.vel))) {
      actions.push( {
        type: IActionType.setEntVel,
        setEntVel: {
          vel: totVel.data as IDim,
          uid: this.uid,
        }
      })
    }

    this.actions = [];
    return actions;
  }

  setCreative(val: boolean) {
    this.creative = val;
    this.gravitable = !val;
  }

  update(delta: number) {
    this.onGround = false;
    if (this.fire.count > 0 && !this.fire.holding) this.fire.count--;
    this.baseUpdate(delta);
  }

  hit(_entity: Entity, where: FaceLocater) {
    this.vel[where.side] = 0;
    if (where.side === 1 && where.dir === 0) {
      this.onGround = true;
      this.jumpCount = 0;
    }
  }

  fireball() {
    if (this.fire.count > 0) return;

    const vel = this.rotCart.scalarMultiply(-.4).data as IDim;
    const pos = arrayAdd(arrayAdd(this.pos.data, arrayScalarMul(vel, 4)), [.5,2,.5]) as IDim;
    const ball = new Projectile(new Vector(pos), vel);

    this.actions.push({
      type: IActionType.addEntity,
      addEntity: {
        ent: ball.serialize(),
      }
    });

    this.fire.count = this.fire.coolDown;
  }
}
