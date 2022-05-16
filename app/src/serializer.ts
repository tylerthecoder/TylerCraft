import { BLOCKS } from "./blockdata";
import { Cube } from "./entities/cube";
import { Entity } from "./entities/entity";
import { EntityDto } from "./entities/EntityDto";
import { IEntityType } from "./entities/IEntityType";
import { ISerializedPlayer, Player } from "./entities/player";
import { ISerializedProjectile, Projectile } from "./entities/projectile";
import { Vector3D } from "./utils/vector";

export type ISerializedCube = [pos: string, type: BLOCKS];

export function serializeCube(cube: Cube, pos: string = cube.pos.toIndex()): ISerializedCube {
  return [pos, cube.type];
}

export function deserializeCube(data: ISerializedCube): Cube {
  const cube = new Cube(
    data[1],
    Vector3D.fromIndex(data[0]),
  );
  return cube;
}

export function deserializeEntity(data: EntityDto) {
  switch (data.type) {
    case IEntityType.Projectile:
      return Projectile.deserialize(data as ISerializedProjectile)
    case IEntityType.Player:
      return Player.deserialize(data as ISerializedPlayer)
  }
}

export function getEntityType(ent: Entity) {
  if (ent instanceof Player) {
    return IEntityType.Player;
  } else if (ent instanceof Projectile) {
    return IEntityType.Projectile;
  }
}