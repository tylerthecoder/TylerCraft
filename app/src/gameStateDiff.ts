import { ISerializedEntity } from "./entities/entity";
import { Game } from "./game";
import { getEntityType } from "./serializer";
import { ISerializedChunk } from "./world/chunk";

export interface IGameDiff {
	entities: {
		add?: ISerializedEntity[];
		update?: ISerializedEntity[];
		remove?: string[];
	},
	chunks: {
		update?: ISerializedChunk[];
	}
}

export interface IGameStateDiffData {
	addEntitiesIds: string[];
	updateEntitiesIds: string[];
	removeEntitiesIds: string[];
	updateChunkIds: string[];
}

// Stores information about which entities or chunks are dirty
export class GameStateDiff {
	constructor(
		private game: Game,
		data?: IGameStateDiffData
	) {
		if (!data) {
			return;
		}
		this.addEntitiesIds = data.addEntitiesIds;
		this.updateEntitiesIds = data.updateEntitiesIds;
		this.removeEntitiesIds = data.removeEntitiesIds;
		this.updateChunkIds = data.updateChunkIds;
	}

	private addEntitiesIds: string[] = [];
	private updateEntitiesIds: string[] = [];
	private removeEntitiesIds: string[] = [];
	private updateChunkIds: string[] = [];


	public addEntity(entityId: string) {
		this.addEntitiesIds.push(entityId);
	}

	public removeEntity(entityId: string) {
		this.removeEntitiesIds.push(entityId);
	}

	public updateEntity(entityId: string) {
		this.updateEntitiesIds.push(entityId);
	}

	public updateChunk(chunkId: string) {
		this.updateChunkIds.push(chunkId);
	}

	public getDirtyChunks(): ReadonlyArray<string> {
		return this.updateChunkIds;
	}

	public getNewEntities(): ReadonlyArray<string> {
		return this.addEntitiesIds;
	}

	public getUpdatedEntities(): ReadonlyArray<string> {
		return this.updateEntitiesIds;
	}

	public getRemovedEntities(): ReadonlyArray<string> {
		return this.removeEntitiesIds;
	}

	public clear() {
		this.addEntitiesIds = [];
		this.updateEntitiesIds = [];
		this.removeEntitiesIds = [];
		this.updateChunkIds = [];
	}

	public get(): IGameDiff {
		const diff: IGameDiff = {
			entities: {},
			chunks: {},
		};

		if (this.addEntitiesIds.length > 0) {
			diff.entities.add = this.addEntitiesIds.map(id => this.game.entities.get(id)).map(entity => entity.serialize(getEntityType(entity)!));
		}

		if (this.removeEntitiesIds.length > 0) {
			diff.entities.remove = this.removeEntitiesIds;
		}

		if (this.updateEntitiesIds.length > 0) {
			diff.entities.update = this.updateEntitiesIds.map(id => this.game.entities.get(id)).map(entity => entity.serialize(getEntityType(entity)!));
		}

		if (this.updateChunkIds.length > 0) {
			diff.chunks.update = this.updateChunkIds.map(id => this.game.world.getChunkById(id).serialize());
		}

		return diff;
	}

	private serialize(): IGameStateDiffData {
		return {
			addEntitiesIds: this.addEntitiesIds,
			updateEntitiesIds: this.updateEntitiesIds,
			removeEntitiesIds: this.removeEntitiesIds,
			updateChunkIds: this.updateChunkIds,
		};
	}

	public copy(): GameStateDiff {
		return new GameStateDiff(this.game, this.serialize());
	}

	public append(diff: GameStateDiff) {
		this.addEntitiesIds = this.addEntitiesIds.concat(diff.getNewEntities());
		this.updateEntitiesIds = this.updateEntitiesIds.concat(diff.getUpdatedEntities());
		this.removeEntitiesIds = this.removeEntitiesIds.concat(diff.getRemovedEntities());
		this.updateChunkIds = this.updateChunkIds.concat(diff.getDirtyChunks());
	}


}