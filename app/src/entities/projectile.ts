import { Entity, FaceLocater, IEntity } from "./entity";
import { IEntityType } from "./entityHolder";
import { MovableEntity, MovableEntityDto } from "./moveableEntity";


export interface ProjectileDto extends MovableEntityDto {
  type: IEntityType.Projectile;
}

export class Projectile extends MovableEntity<ProjectileDto> implements IEntity {
  // abstract values
  static readonly type = IEntityType.Projectile;
  get type() { return Projectile.type; }

  gravitable = false;

  getDto(): ProjectileDto {
    return {
      ...this.baseDto(),
      type: Projectile.type,
    }
  }

  set(data: Partial<ProjectileDto>): void {
    this.baseSet(data);
  }

  update(delta: number) {
    this.baseUpdate(delta);
  }

  hit(ent: Entity, _where: FaceLocater) {
    // TODO remove block on world instead of returning action
    // do damage or delete block
    // if (ent instanceof Cube) {
    //   this.actions.push(
    //     {
    //       dontSendToServer: true,
    //       type: IActionType.removeBlock,
    //       removeBlock: {
    //         blockPos: ent.pos.data as IDim,
    //       },
    //     },
    //     {
    //       dontSendToServer: true,
    //       type: IActionType.removeEntity,
    //       removeEntity: {
    //         uid: this.uid,
    //       }
    //     }
    //   )
    // } else {
    //   this.actions.push(
    //     {
    //       type: IActionType.hurtEntity,
    //       hurtEntity: {
    //         uid: ent.uid,
    //         amount: 5,
    //       }
    //     },
    //     {
    //       dontSendToServer: true,
    //       type: IActionType.removeEntity,
    //       removeEntity: {
    //         uid: this.uid,
    //       }
    //     }
    //   )
    // }
  }
}