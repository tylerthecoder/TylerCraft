import { Game, IGameMetadata, ISerializedGame } from "../src/game";
import { Chunk, ISerializedChunk } from "../src/world/chunk";
import { IChunkReader, WorldModel, IEmptyWorld, IGameReader } from "../src/worldModel";
import { db } from "./app";

export class RamChunkReader implements IChunkReader {
  private chunkMap = new Map<string, ISerializedChunk>();
  constructor(
    serializedGame?: ISerializedGame
  ) {
    if (!serializedGame) return;
    for (const chunk of serializedGame.world.chunks) {
      this.chunkMap.set(chunk.chunkPos, chunk);
    }
  }

  async getChunk(chunkPos: string) {
    const serializedChunk = this.chunkMap.get(chunkPos);
    if (!serializedChunk) return null;
    return Chunk.deserialize(serializedChunk);
  }
}

export class DbWorldModel extends WorldModel {
  private gameCollection = db.collection("games");

  async createWorld(): Promise<IEmptyWorld> {
    return {
      worldId: Math.random() + "",
      chunkReader: new RamChunkReader(),
    }
  }

  async getWorld(gameId: string): Promise<IGameReader | null> {
    const game = await this.gameCollection.findOne<ISerializedGame>({ gameId });

    if (!game) return null;

    return {
      data: game,
      chunkReader: new RamChunkReader(game),
      activePlayers: [],
    }
  }

  async getAllWorlds() {
    // const games: IGameMetadata[] = [];
    const games: IGameMetadata[] = await this.gameCollection.find<ISerializedGame>(
      {},
      {
        projection: {
          gameId: 1,
          name: 1,
        }
      }
    ).toArray();
    return games;
  }

  async saveWorld(game: Game) {
    console.log("Saving world");
    const serializedWorld = game.serialize();
    await this.gameCollection.updateOne({
      gameId: game.gameId,
    }, { $set: serializedWorld }, {
      upsert: true,
    });
  }

  async deleteWorld(worldId: string) {
    await this.gameCollection.deleteOne({ gameId: worldId });
  }
}

