import { Entity, RenderType, FaceLocater } from "./entity";
import { Ball } from "./ball";
import { arrayAdd, arrayMul, arrayCompare } from "../utils";
import { Game } from "../game";
import { IDim, IAction } from "../../types";
import { Vector, Vector3D } from "../utils/vector";

export class Player extends Entity {
  // Entity overrides
  pos: Vector3D = new Vector3D([0, 5, 0]);
  dim: IDim = [1, 2, 1];
  rot: IDim = [0, 0, 0];
  renderType = RenderType.CUBE;

  // Player Member Variables
  thirdPerson = false;
  onGround = false;
  canFire = true;
  jumpCount = 0;

  creative = false;

  constructor(public game: Game, public isReal: boolean) {
    super();

    this.setCreative(false);
  }

  getActions(): IAction[] {
    return this.getPlanerActionsFromMetaActions();
  }

  setCreative(val: boolean) {
    this.creative = val;
    this.gravitable = !val;
  }

  update(delta: number) {
    this.onGround = false;
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
    if (this.canFire && this.isReal) {
      const pos = arrayAdd(this.pos.data, [0, 2, 0]) as IDim;
      const random = [1, 1, 1].map(e => Math.random() * 0.2 - 0.1);
      const vel = arrayAdd([0, 0.2, 0], random) as IDim;
      const ball = new Ball(new Vector(pos), vel);
      this.game.addEntity(ball);
      this.canFire = false;
    }
  }
}
