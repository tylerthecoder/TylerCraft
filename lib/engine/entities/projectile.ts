import { Cube, Game, IDim, Player } from "../index.js";
import { Vector3D } from "../utils/vector.js";
import { World } from "../world/index.js";
import { Entity, FaceLocater, IEntity } from "./entity.js";
import { IEntityType } from "./entityType.js";
import { MovableEntity, MovableEntityDto } from "./moveableEntity.js";

export interface ProjectileDto extends MovableEntityDto {
  type: IEntityType.Projectile;
}

export class Projectile
  extends MovableEntity<ProjectileDto>
  implements IEntity
{
  // abstract values
  static readonly type = IEntityType.Projectile;
  get type() {
    return Projectile.type;
  }

  gravitable = true;

  getDto(): ProjectileDto {
    return {
      ...this.baseDto(),
      type: Projectile.type,
    };
  }

  set(data: Partial<ProjectileDto>): void {
    this.baseSet(data);
  }

  update(world: World, delta: number) {
    // this.baseUpdate(delta);
    this.soil();
  }

  hit(game: Game, ent: Entity | Cube, _where: FaceLocater) {
    console.log("HIT", ent);
    if (ent instanceof Entity) {
      if (ent instanceof Player) {
        ent.hurt(5);
      }

      game.removeEntity(this);
    } else {
      game.removeBlock(ent);
    }
  }
}
