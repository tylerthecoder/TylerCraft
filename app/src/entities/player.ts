import { Entity, RenderType } from "./entity";
import { Ball } from "./ball";
import { arrayAdd } from "../utils";
import { IDim } from "..";
import { Game } from "../game";

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

  constructor(public game: Game) {
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

  fireball() {
    if (this.canFire) {
      const pos = arrayAdd(this.pos, [0, 2, 0]) as IDim;
      const ball = new Ball(pos, [0, 0.1, 0]);
      ball.applyForce([0, 0.1, 0]);
      this.game.addEntity(ball);
      this.canFire = false;
    }
  }
}
