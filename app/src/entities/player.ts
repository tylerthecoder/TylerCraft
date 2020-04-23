import { Entity, RenderType, FaceLocater } from "./entity";
import { Ball } from "./ball";
import { arrayAdd, toSphereCords, arrayMul, arrayCompare } from "../utils";
import { Game } from "../game";
import { IDim, IAction } from "../../types";

export class Player extends Entity {
  pos: IDim = [-2, 5, -2];
  dim: IDim = [1, 2, 1];
  rot: IDim = [Math.PI / 2, 0, 0];

  renderType = RenderType.CUBE;

  metaActions = new Set();

  uid: string;

  thirdPerson = false;

  onGround = false;
  canFire = true;
  jumpCount = 0;

  constructor(public game: Game, public isReal: boolean) {
    super();
  }

  getActions(): IAction[] {
    return this.getPlanerActionsFromMetaActions();
    // let vel: IDim = [0, 0, 0];
    // let cartVel: number[];
    // const actions: IAction[] = [];

    // // const didMetaActionsChange =
    // //   Array.from(this.metaActions).some(metaAction => !this.prevMetaActions.has(metaAction)) ||
    // //   this.metaActions.size !== this.prevMetaActions.size;


    // // if (!didMetaActionsChange) {
    // //   return actions;
    // // }

    // if (this.prevMetaActions.size > 0 && this.metaActions.size === 0) {
    //   actions.push({
    //     setEntVel: {
    //       uid: this.uid,
    //       vel: [0,0,0]
    //     }
    //   });
    // }
    // this.prevMetaActions = new Set(this.metaActions);

    // this.metaActions.forEach(metaAction => {
    //   switch (metaAction) {
    //     case "forward":
    //       cartVel = toSphereCords(-1, -this.rot[1], Math.PI / 2);
    //       vel = arrayAdd(vel, cartVel) as IDim;
    //       break;
    //     case "backward":
    //       cartVel = toSphereCords(1, -this.rot[1], Math.PI / 2);
    //       vel = arrayAdd(vel, cartVel) as IDim;
    //       break;
    //     case "left":
    //       cartVel = toSphereCords(1, -this.rot[1] - Math.PI / 2, Math.PI / 2);
    //       vel = arrayAdd(vel, cartVel) as IDim;
    //       break;
    //     case "right":
    //       cartVel = toSphereCords(1, -this.rot[1] + Math.PI / 2, Math.PI / 2);
    //       vel = arrayAdd(vel, cartVel) as IDim;
    //       break;
    //     case "jump":
    //       actions.push({
    //         playerJump: {
    //           uid: this.uid
    //         }
    //       });
    //   }
    //   vel = arrayMul(vel, [.2, .2, .2]) as IDim;
    //   const isDifferentVel = !arrayCompare(vel, this.prevVel)

    //   this.prevVel = vel.slice(0) ;

    //   if (isDifferentVel) {
    //     actions.push({
    //       setEntVel: {
    //         vel,
    //         uid: this.uid
    //       }
    //     })
    //   }
    // });
    // return actions;
  }

  setMoveVel(amount: { x: number; y: number }) {
    console.log(amount);
    this.vel[0] = amount.x;
    this.vel[2] = amount.y;
  }

  update(delta: number) {
    this.onGround = false;
    this.baseUpdate(delta);
  }

  hit(_entity: Entity, where: FaceLocater) {
    if (where.side == 1 && where.dir == -1) {
      this.onGround = true;
      this.jumpCount = 0;
    }
  }

  fireball() {
    if (this.canFire && this.isReal) {
      const pos = arrayAdd(this.pos, [0, 2, 0]) as IDim;
      const random = [1, 1, 1].map(e => Math.random() * 0.2 - 0.1);
      const vel = arrayAdd([0, 0.2, 0], random) as IDim;
      const ball = new Ball(pos, vel);
      this.game.addEntity(ball);
      this.canFire = false;
    }
  }
}
