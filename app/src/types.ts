import { BLOCKS } from "../src/blockdata";
import { ISerializedEntity } from "../src/entities/entity";
import { ISerializedEntities } from "./entities/entityHolder";
import { ISerializedChunk } from "./world/chunk";

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
    ent: ISerializedEntity,
  }
  removeEntity?: {
    uid: string;
  }
  hurtEntity?: {
    uid: string,
    amount: number,
  }
}

export const enum ISocketMessageType {
  // from client
  getChunk, // server sends setChunk
  newWorld, // server sends welcome
  saveWorld,
  // this could be for joining an existing world or starting up an old one
  joinWorld, // server sends welcome
  // from server
  welcome,
  setChunk,
  newPlayer,
  playerLeave,
  // both
  actions,
}

export interface ISocketWelcomePayload {
  uid: string;
  worldId: string;
  entities: ISerializedEntities;
  activePlayers: string[];
}

export interface ISocketMessage {
  type: ISocketMessageType;
  // from client
  joinWorldPayload?: {
    myUid: string;
    worldId: string;
  },
  newWorldPayload?: {
    myUid: string;
  },
  saveWorldPayload?: {
    worldId: string;
  },
  getChunkPayload?: {
    pos: string,
  }

  // from server
  welcomePayload?: ISocketWelcomePayload,
  newPlayerPayload?: {
    uid: string,
  },
  playerLeavePayload?: {
    uid: string,
  },
  setChunkPayload?: {
    pos: string,
    data: ISerializedChunk,
  }

  // from either
  actionPayload?: IAction[];
}