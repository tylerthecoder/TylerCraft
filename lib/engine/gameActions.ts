import { BLOCKS } from "./blockdata.js";
import { CameraRay, ICameraData } from "./camera.js";
import CubeHelpers from "./entities/cube.js";
import { Player } from "./entities/player.js";
import { Game } from "./game.js";
import { IDim } from "./types.js";
import { Direction, Vector3D } from "./utils/vector.js";

export enum GameAction {
	PlayerJump = "jump",
	PlaceBlock = "placeBlock",
	RemoveBlock = "removeBlock",
	PlayerMove = "move",
	PlayerRotate = "rotate",
	PlayerSetPos = "setPlayerPos",
	PlayerBeltLeft = "playerBeltLeft",
	PlayerBeltRight = "playerBeltRight",
	PlayerSetBeltIndex = "playerSetBeltIndex",
	// Places a single block under the player
	PlaceDebugBlock = "placeDebugBlock",
	Save = "save",
	ChangeName = "changeName",
}

export type GameActions = {
	[Prop in GameAction]: Prop;
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
	[GameAction.PlayerSetBeltIndex]: {
		playerUid: string;
		index: number;
	}
	[GameAction.PlayerBeltLeft]: {
		playerUid: string;
	}
	[GameAction.PlayerBeltRight]: {
		playerUid: string;
	}
	[GameAction.PlayerJump]: {
		playerUid: string;
	},
	[GameAction.PlayerSetPos]: {
		playerUid: string;
		pos: IDim;
	},
	[GameAction.PlaceBlock]: {
		playerUid: string;
		cameraData: CameraRay;
	},
	[GameAction.RemoveBlock]: {
		playerUid: string;
		cameraData: CameraRay;
	}
	[GameAction.ChangeName]: {
		name: string;
	}
	[GameAction.Save]: undefined,
	[GameAction.PlaceDebugBlock]: {
		playerUid: string;
	}
}

export class GameActionDto<T extends GameAction = GameAction> {
	readonly action: T = undefined as any;
	readonly data: GameActionData[T] = undefined as any;
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
			const { cameraData, playerUid } = action.data;
			const player = this.getPlayer(playerUid);
			player.useItem(this.game, cameraData);
			return;
		}

		if (action.isType(GameAction.RemoveBlock)) {
			console.log("Removing Block");
			const { cameraData } = action.data;
			const lookingData = this.game.world.lookingAt(cameraData);
			if (!lookingData) return;
			const cube = lookingData.cube;
			if (!cube) return;
			this.game.world.removeBlock(this.game.stateDiff, cube.pos);
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

		if (action.isType(GameAction.PlayerBeltLeft)) {
			const { playerUid } = action.data;
			const player = this.getPlayer(playerUid);
			player.belt.moveLeft();
			this.game.stateDiff.updateEntity(player.uid);
		}

		if (action.isType(GameAction.PlayerBeltRight)) {
			const { playerUid } = action.data;
			const player = this.getPlayer(playerUid);
			player.belt.moveRight();
			this.game.stateDiff.updateEntity(player.uid);
		}

		if (action.isType(GameAction.PlayerSetBeltIndex)) {
			const { playerUid, index } = action.data;
			const player = this.getPlayer(playerUid);
			player.belt.setIndex(index);
			this.game.stateDiff.updateEntity(player.uid);
		}

		if (action.isType(GameAction.PlaceDebugBlock)) {
			console.log("Placing debug block")
			const { playerUid } = action.data;
			const player = this.getPlayer(playerUid);
			const pos = player.pos.floor();
			const cube = CubeHelpers.createCube(BLOCKS.gold, pos);
			this.game.world.addBlock(this.game.stateDiff, cube, {loadChunkIfNotLoaded: true});
		}

	}

}

