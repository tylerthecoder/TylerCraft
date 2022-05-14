import { BLOCKS, ExtraBlockData } from "./blockdata";
import { IDim } from "./types";
import { Direction } from "./utils/vector";


export enum GameActionType {
	Jump,
	PlaceBlock,
	RemoveBlock,
	Move,
	Rotate,
	SetPlayerPos,
	Save,
	ChangeName
}

export interface IBasePlayerAction {
	type: GameActionType;
	playerUid: string;
	// dontSendToServer?: boolean;
	// isFromServer?: boolean;
}

export interface IPlaceBlockAction extends IBasePlayerAction {
	type: GameActionType.PlaceBlock;
	blockType: BLOCKS;
	blockData?: ExtraBlockData;
	/** The server should already have this but just in case it is behind */
	playerRot: IDim;
}

export interface IRemoveBlockAction extends IBasePlayerAction {
	type: GameActionType.RemoveBlock;
	/** The server should already have this but just in case it is behind */
	playerRot: IDim;
}

export interface IPlayerJumpAction extends IBasePlayerAction {
	type: GameActionType.Jump;
}

export interface IPlayerMoveAction extends IBasePlayerAction {
	type: GameActionType.Move;
	playerRot: IDim;
	direction: Direction;
}

export interface IPlayerSetPosAction extends IBasePlayerAction {
	type: GameActionType.SetPlayerPos;
	pos: IDim;
}

export interface IPlayerRotAction extends IBasePlayerAction {
	playerRot: IDim;
}

export interface IGameActionSave {
	type: GameActionType.Save;
}

export interface IChangeNameGameAction {
	type: GameActionType.ChangeName;
	name: string
}

export type GameAction =
	IPlaceBlockAction |
	IRemoveBlockAction |
	IPlayerJumpAction |
	IPlayerMoveAction |
	IPlayerRotAction |
	IGameActionSave |
	IChangeNameGameAction |
	IPlayerSetPosAction;