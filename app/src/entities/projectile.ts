import { Entity, FaceLocater, RenderType } from "./entity";
import { IAction, IActionType, IDim } from "../../types";
import { Vector3D } from "../utils/vector";
import { Cube } from "./cube";
import Random from "../utils/random";

export class Projectile extends Entity {
  gravitable = false;
  renderType = RenderType.CUBE;

  private actions: IAction[] = [];

  constructor(
    public pos: Vector3D,
    public vel: IDim,
    public dim: IDim = [.2, .2, .2],
  ) {
    super();
    this.uid = Random.randomString();
  }

  update(delta: number) {
    this.baseUpdate(delta);
  }

  getActions(): IAction[] {
    const actions = this.actions;
    this.actions = [];
    return actions;
  }

  hit(ent: Entity, where: FaceLocater) {
    // do damage or delete block
    if (ent instanceof Cube) {
      this.actions.push(
        {
          dontSendToServer: true,
          type: IActionType.removeBlock,
          removeBlock: {
            blockPos: ent.pos.data as IDim,
          },
        },
        {
          dontSendToServer: true,
          type: IActionType.removeEntity,
          removeEntity: {
            uid: this.uid,
          }
        }
      )
    }
  }
}