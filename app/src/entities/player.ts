import { Entity, RenderType, FaceLocater } from "./entity";
import { Ball } from "./ball";
import { arrayAdd } from "../utils";
import { Game } from "../game";
import { IDim } from "../../types";

export class Player extends Entity {
  pos: IDim = [-2, 5, -2];
  dim: IDim = [1, 2, 1];
  rot: IDim = [Math.PI / 2, 0, 0];

  renderType = RenderType.CUBE;

  uid: string;

  thirdPerson = false;

  onGround = false;
  canFire = true;
  jumpCount = 0;

  constructor(public game: Game, public isReal: boolean) {
    super();
  }

  update(delta: number) {
    this.onGround = false;
    this.baseUpdate(delta);
  }

  jump() {
    if (this.jumpCount < 5) {
      this.vel[1] = 0.1;
      this.jumpCount++;
    }
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
