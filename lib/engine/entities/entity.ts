import { Game } from "../index.js";
import { IDim } from "../types.js";
import { Vector3D } from "../utils/vector.js";
import CubeHelpers, { Cube, CUBE_DIM } from "./cube.js";
import { IEntityType } from "./entityType.js";

export enum RenderType {
  CUBE,
  SPHERE,
}

export interface FaceLocater {
  side: number;
  dir: 1 | 0;
}

export enum MetaAction {
  right,
  left,
  forward,
  backward,
  up,
  down,
  jump,
  fireball,
}

export interface EntityDto {
  uid: string;
  pos: IDim;
  dim: IDim;
  type: IEntityType;
}

/**
 * Should be extended by all non-abstract sub classes
 * */
export interface IEntity {
  type: IEntityType;
}

export abstract class Entity<
  DTO extends EntityDto = EntityDto,
  DtoNoType = Omit<DTO, "type">
> {
  // Used to mark this entity as changed.
  // This will then be sent to the server
  dirty = false;

  /* make dirty
   * TODO pass in the properties that have changed
   */
  protected soil() {
    this.dirty = true;
  }

  public get isDirty() {
    return this.dirty;
  }

  pos: Vector3D = new Vector3D([0, 0, 0]);
  dim: IDim = [1, 1, 1];
  uid = "";

  constructor(dto: Partial<DtoNoType>) {
    this.set(dto);
  }

  // TODO make the allowable entities generic
  abstract type: IEntityType;

  abstract getDto(): DTO;

  protected baseDto(): EntityDto {
    return {
      uid: this.uid,
      pos: this.pos.data as IDim,
      dim: this.dim,
      type: this.type,
    };
  }

  abstract set<T extends Partial<DtoNoType>>(data: T): void;

  protected baseSet(data: Partial<EntityDto>) {
    this.soil();
    if (data.pos) {
      this.pos = new Vector3D(data.pos);
    }
    if (data.dim) {
      this.dim = data.dim;
    }
    if (data.uid) {
      this.uid = data.uid;
    }
  }

  abstract update(delta: number): void;
  abstract hit(game: Game, entity: Entity | Cube, where: FaceLocater): void;

  setUid(uid: string) {
    this.uid = uid;
  }

  isCollide(ent: Entity) {
    return CubeHelpers.isCollide(this, ent);
  }

  // push me (this) out of the supplied entity (ent)
  pushOut(game: Game, ent: Entity | Cube): FaceLocater {
    let min = [Infinity];

    // 0 -> 1, 1 -> 0
    const switchDir = (dir: number) => (dir + 1) % 2;

    const entDim = ent instanceof Entity ? ent.dim : CUBE_DIM;

    for (let i = 0; i < 3; i++) {
      for (let dir = 0; dir <= 1; dir++) {
        // calculate the distance from a face on the player to a face on the ent
        const p = this.pos.get(i) + this.dim[i] * dir;
        const c = ent.pos.get(i) + entDim[i] * switchDir(dir);
        const dist = Math.abs(c - p);
        // find the shortest distance (that is best one to move)
        if (dist < min[0]) {
          min = [dist, i, dir];
        }
      }
    }

    const [, i, dir] = min;

    const newPos =
      ent.pos.get(i) + entDim[i] * switchDir(dir) - this.dim[i] * dir;

    this.pos.set(i, newPos);

    this.hit(game, ent, {
      side: i,
      dir: dir as 0 | 1,
    });

    if (ent instanceof Entity) {
      ent.hit(game, this, {
        side: i,
        dir: dir as 0 | 1,
      });
    }

    this.soil();

    return {
      side: i,
      dir: dir as 1 | 0,
    };
  }
}
