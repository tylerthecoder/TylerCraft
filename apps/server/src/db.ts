import {
  IApiGameMetadata,
  ISerializedGame,
  serializeGame,
} from "@craft/engine";
import { CreateGameOptions, Game } from "@craft/rust-world";
import { Collection, Document, MongoClient } from "mongodb";

export class GameDb {
  static async makeClient() {
    const DB_URL = process.env.DB_URL;
    if (!DB_URL) {
      throw new Error("DB_URL not defined");
    }
    console.log("Connecting to database");
    const client = await MongoClient.connect(DB_URL);
    console.log("Connected to database 🎉");
    return new GameDb(client);
  }

  private gameCollection: Collection<Document & ISerializedGame>;

  private constructor(private client: MongoClient) {
    this.gameCollection = this.client.db("tylercraft").collection("games");
  }

  getAllGameMetadata(): Promise<IApiGameMetadata[]> {
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

  async getGame(gameId: string): Promise<ISerializedGame | null> {
    const data: ISerializedGame | null =
      await this.gameCollection.findOne<ISerializedGame>({ gameId });
    if (!data) {
      return null;
    }
    return data;
  }

  async getSerializedGame(gameId: string): Promise<ISerializedGame | null> {
    return await this.gameCollection.findOne<ISerializedGame>({ gameId });
  }

  async getGameMetadata(gameId: string): Promise<{ name: string } | null> {
    return await this.gameCollection.findOne<{ name: string }>(
      { gameId },
      { projection: { name: 1 } }
    );
  }

  async saveGame(game: Game) {
    const serializedGame = serializeGame(game);
    const json = JSON.stringify(serializedGame, null, 2);
    const parsedGame = JSON.parse(json);
    console.log("Saving game parsed", parsedGame);
    console.log("Saving game json", json);
    await this.gameCollection.updateOne(
      { gameId: game.id },
      { $set: parsedGame },
      { upsert: true }
    );
  }

  async createGame(options: CreateGameOptions): Promise<Game> {
    const game = Game.create(options);
    await this.saveGame(game);
    return game;
  }

  async deleteGame(gameId: string) {
    await this.gameCollection.deleteOne({ gameId });
  }
}
