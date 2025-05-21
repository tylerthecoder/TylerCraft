import { Game, World } from "@craft/rust-world";
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

  async getGame(gameId: string): Promise<Game | null> {
    const data: ISerializedGame | null =
      await this.gameCollection.findOne<ISerializedGame>({ gameId });
    if (!data) {
      return null;
    }
    const world = World.deserialize_wasm(createGameOptions.world);
    console.log("world", world);
    const entityHolder = EntityHolder.deserialize_wasm(
      createGameOptions.entities
    );
    console.log("entityHolder", entityHolder);
    const game = Game.build(
      createGameOptions.gameId,
      createGameOptions.name,
      world,
      entityHolder
    );
    return game;
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
    const serializedGame = {
      gameId: game.id,
      name: game.name,
      entities: game.serialize_entities_wasm(),
      world: game.world.serialize_wasm(),
      terrainGen: game.terrainGen.serialize(),
      sandbox: game.sandbox,
    };
    await this.gameCollection.updateOne(
      { gameId: game.id },
      { $set: serializedGame },
      { upsert: true }
    );
  }

  async createGame(): Promise<Game> {
    const game = Game.new();
    await this.saveGame(game);
    return game;
  }

  async deleteGame(gameId: string) {
    await this.gameCollection.deleteOne({ gameId });
  }
}
