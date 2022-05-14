import { ISerializedEntity } from "./entities/entity";
import { Game } from "./game";
import { ISerializedChunk } from "./world/chunk";

export interface IGameDiff {
	entities?: {
		add?: ISerializedEntity[];
		update?: ISerializedEntity[];
		remove?: string[];
	},
	chunks?: {
		update?: ISerializedChunk[];
	}
}

// Stores information about which entities or chunks are dirty
export class GameStateDiff {
	constructor(
		private game: Game
	) { }

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

	public getDirtyChunks() {
		return this.updateChunkIds;
	}

	public clear() {
		this.addEntitiesIds = [];
		this.updateEntitiesIds = [];
		this.removeEntitiesIds = [];
		this.updateChunkIds = [];
	}

	public get(): GameStateDiff {
		// TODO
	}


}