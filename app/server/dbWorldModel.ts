import { IGameMetadata, ISerializedGame } from "../src/game";
import { Chunk, ISerializedChunk } from "../src/world/chunk";
import { IChunkReader, WorldModel } from "../src/worldModel";
import { db } from "./db";


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

  async getWorld(gameId: string) {
    const game = await this.gameCollection.findOne<ISerializedGame>({ gameId });

    if (!game) return null;

    return {
      data: game,
      chunkReader: new RamChunkReader(game)
    }
  }

  async getAllWorlds() {
    const games: IGameMetadata[] = [];
    await this.gameCollection.find<ISerializedGame>({}).forEach(game => {
      games.push({
        gameId: game.gameId,
        name: game.name,
      });
    });
    return games;
  }

  async saveWorld(gameData: ISerializedGame) {
    await this.gameCollection.updateOne({
      gameId: gameData.gameId,
    }, gameData, {
      upsert: true,
    });
  }

  async deleteWorld(worldId: string) {
    await this.gameCollection.deleteOne({gameId: worldId});
  }
}

