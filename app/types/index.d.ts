import { Entity } from "../src/entities/entity";
import { Cube } from "../src/entities/cube";
import { Chunk } from "../src/world/chunk";

export type IDim = [number, number, number];

export interface IAction {
  setEntVel?: {
    vel: IDim;
    uid: string;
  };
  playerJump?: {
    uid: string;
  };
  playerMoveDir?: {
    x: number;
    y: number;
    uid: string;
  };
  playerLeftClick?: {
    newCubePos: IDim;
    entity: Entity;
  };
  playerRightClick?: {
    newCubePos: IDim;
    entity: Entity;
  };
  addBlock?: Cube;
  removeBlock?: Cube;
  blockUpdate?: Chunk;
}
