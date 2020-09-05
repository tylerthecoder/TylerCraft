import { Entity, RenderType, FaceLocater } from "./entity";
import { Ball } from "./ball";
import { arrayAdd, arrayMul, arrayCompare } from "../utils";
import { Game } from "../game";
import { IDim, IAction } from "../../types";

export class Player extends Entity {
  // Entity overrides
  pos: IDim = [0, 5, 0];
  dim: IDim = [1, 2, 1];
  rot: IDim = [0, 0, 0];
  renderType = RenderType.CUBE;

  // Plyaer Member Variables
  thirdPerson = false;
  onGround = false;
  canFire = true;
  jumpCount = 0;

  spectator = false;

  constructor(public game: Game, public isReal: boolean) {
    super();

    this.setSpectator(true);
  }

  getActions(): IAction[] {
    return this.getPlanerActionsFromMetaActions();
  }

  setSpectator(val: boolean) {
    this.spectator = val;
    this.gravitable = !val;
  }

  setMoveVel(amount: { x: number; y: number }) {
    this.vel[0] = amount.x;
    this.vel[2] = amount.y;
  }

  update(delta: number) {
    this.onGround = false;
    this.baseUpdate(delta);
  }

  hit(_entity: Entity, where: FaceLocater) {
    if (where.side === 1 && where.dir === 0) {
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
