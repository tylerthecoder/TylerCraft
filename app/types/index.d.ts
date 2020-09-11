import { Entity, IEntityData } from "../src/entities/entity";
import { BLOCKS } from "../src/blockdata";

export type IDim = [number, number, number];

export const enum IActionType {
  setEntVel,
  playerMoveDir,
  playerPlaceBlock,
  removeBlock,
  playerFireball,
  playerSetPos,
  blockUpdate,
  addEntity,
  removeEntity,
  hurtEntity,
}

export interface IAction {
  type: IActionType;
  dontSendToServer?: boolean;
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
    blockPos: IDim;
  };
  removeBlock?: {
    blockPos: IDim;
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
  addEntity?: {
    ent: IEntityData,
  }
  removeEntity?: {
    uid: string;
  }
  hurtEntity?: {
    uid: string,
    amount: number,
  }
}
