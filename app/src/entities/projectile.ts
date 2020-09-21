import { Entity, FaceLocater, IEntityType } from "./entity";
import { MovableEntity } from "./moveableEntity";
import { IAction, IActionType, IDim } from "../../types";
import { Vector3D } from "../utils/vector";
import { Cube } from "./cube";
import Random from "../utils/random";

export interface ISerializedProjectile {
  uid: string;
  pos: IDim;
  vel: IDim;
  type: IEntityType;
}

export class Projectile extends MovableEntity {
  gravitable = false;

  private actions: IAction[] = [];

  constructor(
    public pos: Vector3D,
    public vel: Vector3D,
    public dim: IDim = [.2, .2, .2],
  ) {
    super();
    this.uid = Random.randomString();
  }

  static deserialize(data: ISerializedProjectile): Projectile {
    const ent = new Projectile(
      new Vector3D(data.pos),
      new Vector3D(data.vel),
    )

    return ent;
  }

  update(delta: number) {
    this.baseUpdate(delta);
  }

  getActions(): IAction[] {
    const actions = this.actions;
    this.actions = [];
    return actions;
  }

  hit(ent: Entity, _where: FaceLocater) {
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
    } else {
      this.actions.push(
        {
          type: IActionType.hurtEntity,
          hurtEntity: {
            uid: ent.uid,
            amount: 5,
          }
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