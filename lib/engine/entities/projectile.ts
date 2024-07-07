import { Cube, Game, Player, Vector3D } from "../index.js";
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

  update(game: Game, world: World, delta: number) {
    const scaledVel = this.vel.scalarMultiply(delta / 16);
    const expectedPos = this.pos.add(scaledVel);
    const newPos = world.tryMove(this, scaledVel);
    this.pos = newPos;

    if (!newPos.equals(expectedPos)) {
      const intersectingPoss = world.getIntersectingBlocksWithEntity(
        expectedPos,
        new Vector3D(this.dim)
      );
      console.log(
        "Projectile hit block",
        intersectingPoss,
        this.pos.data,
        this.dim
      );
      if (intersectingPoss.length > 0) {
        for (const intersectingPos of intersectingPoss) {
          const block = world.getBlockFromWorldPoint(intersectingPos);
          if (block) {
            game.removeBlock(block);
          }
        }
        game.removeEntity(this);
      }
    }
  }
}
