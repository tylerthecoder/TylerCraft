import { IGameMetadata, ISerializedGame } from "@craft/engine";
import { Collection, Document, MongoClient } from "mongodb";

export interface IDbManager {
  getAllGameMetadata(): Promise<IGameMetadata[]>;
  getGame(gameId: string): Promise<ISerializedGame | null>;
  saveGame(game: ISerializedGame): Promise<void>;
  deleteGame(gameId: string): Promise<void>;
}

export class DBManager implements IDbManager {
  static async makeClient() {
    const DB_URL = process.env.DB_URL;
    if (!DB_URL) {
      throw new Error("DB_URL not defined");
    }
    const client = await MongoClient.connect(DB_URL);
    return new DBManager(client);
  }

  private gameCollection: Collection<Document & ISerializedGame>;

  private constructor(private client: MongoClient) {
    this.gameCollection = this.client.db("games").collection("games");
  }

  getAllGameMetadata(): Promise<IGameMetadata[]> {
    return this.gameCollection
      .find<ISerializedGame>(
        {},
        {
          projection: {
            gameId: 1,
            name: 1,
          },
        }
      )
      .toArray();
  }

  getGame(gameId: string): Promise<ISerializedGame | null> {
    return this.gameCollection.findOne<ISerializedGame>({ gameId });
  }

  async saveGame(game: ISerializedGame) {
    await this.gameCollection.updateOne(
      { gameId: game.gameId },
      { $set: game },
      { upsert: true }
    );
  }

  async deleteGame(gameId: string) {
    await this.gameCollection.deleteOne({ gameId });
  }
}
