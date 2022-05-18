import { BLOCKS, ExtraBlockData } from "./blockdata";
import { ICameraData } from "./camera";
import CubeHelpers from "./entities/cube";
import { Player } from "./entities/player";
import { Game } from "./game";
import { IDim } from "./types";
import { Direction, Vector3D } from "./utils/vector";

export enum GameAction {
	PlayerJump = "jump",
	PlaceBlock = "placeBlock",
	RemoveBlock = "removeBlock",
	PlayerMove = "move",
	PlayerRotate = "rotate",
	PlayerSetPos = "setPlayerPos",
	Save = "save",
	ChangeName = "changeName",
}

export interface GameActionData extends Record<GameAction, unknown> {
	[GameAction.PlayerRotate]: {
		playerUid: string;
		playerRot: IDim;
	}
	[GameAction.PlayerMove]: {
		playerUid: string;
		playerRot: IDim;
		directions: Direction[];
	}
	[GameAction.PlayerJump]: {
		playerUid: string;
	},
	[GameAction.PlayerSetPos]: {
		playerUid: string;
		pos: IDim;
	},
	[GameAction.PlaceBlock]: {
		blockType: BLOCKS;
		cameraData: ICameraData;
	},
	[GameAction.RemoveBlock]: {
		cameraData: ICameraData;
	}
	[GameAction.ChangeName]: {
		name: string;
	}
	[GameAction.Save]: undefined,
}

export class GameActionDto<T extends GameAction = GameAction> {
	readonly action: T;
	readonly data: GameActionData[T];
}

export class GameActionHolder<T extends GameAction = GameAction> {
	static create<T extends GameAction>(type: T, data: GameActionData[T]): GameActionHolder<T> {
		return new GameActionHolder(type, data);
	}

	private constructor(
		public type: T,
		public data: GameActionData[T],
	) { }

	getDto(): GameActionDto<T> {
		return {
			action: this.type,
			data: this.data,
		};
	}


	isType<U extends GameAction>(type: U): this is GameActionHolder<U> {
		return (type as GameAction) === this.type;
	}
}

export class GameActionHandler {
	constructor(
		private game: Game
	) { }

	private getPlayer(id: string) {
		return this.game.entities.get<Player>(id);
	}

	handle(action: GameActionHolder<GameAction>) {
		if (action.isType(GameAction.PlayerRotate)) {
			const { playerRot, playerUid } = action.data;
			const player = this.getPlayer(playerUid);
			player.rot = new Vector3D(playerRot);
			this.game.stateDiff.updateEntity(player.uid);
			return;
		}

		if (action.isType(GameAction.PlayerJump)) {
			const { playerUid } = action.data;
			const player = this.getPlayer(playerUid);
			player.tryJump();
			this.game.stateDiff.updateEntity(player.uid);
			return;
		}

		if (action.isType(GameAction.PlaceBlock)) {
			const { blockType, cameraData } = action.data;

			const lookingData = this.game.world.lookingAt(cameraData);
			if (!lookingData) return;
			const { cube } = lookingData;
			if (!cube) return;

			// check to see if any entity is in block
			for (const entity of this.game.entities.iterable()) {
				if (CubeHelpers.isPointInsideOfCube(cube, entity.pos)) {
					return;
				}
			}

			let extraBlockData: ExtraBlockData | undefined = undefined;

			if (blockType === BLOCKS.image) {
				extraBlockData = {
					galleryIndex: 0,
					face: lookingData.face,
				}
			}

			const newCube = CubeHelpers.createCube(
				blockType,
				lookingData.newCubePos as Vector3D,
				extraBlockData,
			);

			console.log(newCube)

			this.game.world.addBlock(newCube);
			return;
		}

		if (action.isType(GameAction.RemoveBlock)) {
			console.log("Removing Block");
			const { cameraData } = action.data;
			const lookingData = this.game.world.lookingAt(cameraData);
			if (!lookingData) return;
			const cube = lookingData.cube;
			if (!cube) return;
			this.game.world.removeBlock(cube.pos);
			return;
		}

		if (action.isType(GameAction.PlayerSetPos)) {
			const { playerUid, pos } = action.data;
			const player = this.game.entities.get<Player>(playerUid);
			player.pos = new Vector3D(pos);
			this.game.stateDiff.updateEntity(player.uid);
			return;
		}

		if (action.isType(GameAction.PlayerMove)) {
			const { directions, playerRot, playerUid } = action.data;
			const player = this.game.entities.get<Player>(playerUid);
			// TODO this might be unnecessary
			player.rot = new Vector3D(playerRot);
			player.moveDirections = directions;
			this.game.stateDiff.updateEntity(player.uid);
		}

		if (action.isType(GameAction.Save)) {
			this.game.save();
		}
	}

}


