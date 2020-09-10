import { Entity, RenderType, FaceLocater } from "./entity";
import { arrayAdd, arrayScalarMul} from "../utils";
import { Game } from "../game";
import { IDim, IAction } from "../../types";
import { Vector, Vector3D } from "../utils/vector";
import { Projectile } from "./projectile";

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
      const vel = this.rotCart.scalarMultiply(-.4).data as IDim;
      const pos = arrayAdd(arrayAdd(this.pos.data, arrayScalarMul(vel, 4)), [.5,2,.5]) as IDim;
      const ball = new Projectile(new Vector(pos), vel);
      this.game.addEntity(ball);
      this.canFire = false;
    }
  }
}
