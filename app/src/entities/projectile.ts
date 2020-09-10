import { Entity, FaceLocater, IEntityData, RenderType } from "./entity";
import { IAction, IActionType, IDim } from "../../types";
import { Vector3D } from "../utils/vector";
import { Cube } from "./cube";
import Random from "../utils/random";
import { MovableEntity } from "./moveableEntity";

export class Projectile extends MovableEntity {
  gravitable = false;
  renderType = RenderType.CUBE;

  private actions: IAction[] = [];

  static deserialize(data: IEntityData): Entity {
    const ent = new Projectile(
      new Vector3D(data.pos),
      data.vel,
    )

    return ent;
  }

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