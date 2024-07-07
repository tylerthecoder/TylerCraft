import { Game, World } from "../index.js";
import { IDim } from "../types.js";
import { Vector3D } from "../utils/vector.js";
import { Cube } from "./cube.js";
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

  abstract update(game: Game, world: World, delta: number): void;

  setUid(uid: string) {
    this.uid = uid;
  }
}
