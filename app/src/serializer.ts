import { BLOCKS } from "./blockdata";
import { Cube } from "./entities/cube";
import { Entity, IEntityType, ISerializedEntity } from "./entities/entity";
import { MovableEntity } from "./entities/moveableEntity";
import { ISerializedPlayer, Player } from "./entities/player";
import { Projectile } from "./entities/projectile";
import { Vector } from "./utils/vector";

export type ISerializedCube = [pos: string, type: BLOCKS];

export function serializeCube(cube: Cube, pos: string = cube.pos.toString()): ISerializedCube {
  return [pos.toString(), cube.type];
}

export function deserializeCube(data: ISerializedCube): Cube {
  const cube = new Cube(
    data[1],
    Vector.fromString(data[0]),
  );
  return cube;
}

export function deserializeEntity(data: ISerializedEntity) {
    switch (data.type) {
    case IEntityType.Projectile:
      return Projectile.deserialize(data)
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