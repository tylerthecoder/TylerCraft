import { Entity } from "../src/entities/entity";
import { BLOCKS } from "../src/blockdata";

export type IDim = [number, number, number];

export const enum IActionType {
  setEntVel,
  playerJump,
  playerMoveDir,
  playerPlaceBlock,
  playerRemoveBlock,
  playerFireball,
  playerSetPos,
  blockUpdate,
}

export interface IAction {
  type: IActionType;
  isFromServer?: boolean;
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
  playerPlaceBlock?: {
    blockType: BLOCKS;
    newCubePos: IDim;
    entity: Entity;
  };
  playerRemoveBlock?: {
    newCubePos: IDim;
    entity: Entity;
  };
  playerFireball?: {
    uid: string;
  };
  // we *technically* shouldn't need this but the player position gets off over time
  playerSetPos?: {
    uid: string;
    pos: IDim;
  };
  blockUpdate?: {
    chunkId: string;
  };
}
