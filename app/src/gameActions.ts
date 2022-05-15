import { BLOCKS, ExtraBlockData } from "./blockdata";
import { ICameraData } from "./camera";
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

interface BaseAction {
	type: GameActionType;
}

export interface IBasePlayerAction extends BaseAction {
	playerUid: string;
}

export interface IPlaceBlockAction extends IBasePlayerAction {
	type: GameActionType.PlaceBlock;
	blockType: BLOCKS;
	cameraData: ICameraData;
}

export interface IRemoveBlockAction extends IBasePlayerAction {
	type: GameActionType.RemoveBlock;
	cameraData: ICameraData;
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
	type: GameActionType.Rotate;
	playerRot: IDim;
}

export interface IGameActionSave extends BaseAction {
	type: GameActionType.Save;
}

export interface IChangeNameGameAction extends BaseAction {
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