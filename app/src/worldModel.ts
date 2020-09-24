import { IGameMetadata, ISerializedGame } from "./game";
import { Chunk } from "./world/chunk";


export interface IChunkReader {
  getChunk(chunkPos: string): Promise<Chunk|null>;
}

export interface IGameReader {
  data: ISerializedGame;
  chunkReader: IChunkReader;
}

export abstract class WorldModel {
  abstract getWorld(worldId: string): Promise<IGameReader|null>;
  abstract saveWorld(data: ISerializedGame): Promise<void>;
  abstract getAllWorlds(): Promise<IGameMetadata[]>;
  abstract deleteWorld(worldId: string): Promise<void>;
}
