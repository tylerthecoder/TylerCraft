import { ISerializedEntities } from "@craft/engine/entities/entityHolder";
import { ICreateGameOptions, IGameMetadata } from "@craft/engine/game";
import { IConfig } from "@craft/engine/src/config";
import { GameWrapper, ISerializedWorld } from "@craft/engine/src/wrappers";
import {
  EntityHolder,
  Game,
  SandBoxGScript,
  SerializedEntityHolder,
  TerrainGenerator,
  World,
} from "@craft/rust-world";

export interface ISerializedGame {
  gameId: string;
  name: string;
  entities: SerializedEntityHolder;
  world: World;
  terrainGen: TerrainGenerator;
  sandbox: SandBoxGScript;
}

export class ClientDbGamesService {
  private static WORLDS_OBS = "worlds";

  static async factory() {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const openRequest = window.indexedDB.open("TylerCraftDB", 4);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      openRequest.onerror = (event: any) => {
        // Do something with request.errorCode!
        console.log(event.target);
        console.error("Database error: " + event.target.errorCode);
        reject(event.target);
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      openRequest.onsuccess = (event: any) => {
        // Do something with request.result!
        resolve(event.target.result);
      };
      openRequest.onupgradeneeded = () => {
        console.log("Upgrading database");
        // Save the IDBDatabase interface
        const db = openRequest.result;
        // Create an objectStore for this database
        // world id will be the property on the world object used to identify the world
        if (!db.objectStoreNames.contains(this.WORLDS_OBS)) {
          db.createObjectStore(this.WORLDS_OBS, {
            keyPath: "gameId",
            autoIncrement: true,
          });
        }
      };
    });

    return new ClientDbGamesService(db);
  }

  private constructor(private db: IDBDatabase) { }

  newGame(): GameWrapper {
    return GameWrapper.makeGame();
  }

  createGame(createGameOptions: ISerializedGame): GameWrapper {
    console.log("createGameOptions", createGameOptions);
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

    return new GameWrapper(game);
  }

  getAllGames(): Promise<IGameMetadata[]> {
    return new Promise((resolve) => {
      const transaction = this.db.transaction([
        ClientDbGamesService.WORLDS_OBS,
      ]);
      const objectStore = transaction.objectStore(
        ClientDbGamesService.WORLDS_OBS
      );

      const getAllRequest = objectStore.getAll();
      getAllRequest.onsuccess = (event: any) => {
        if (event.target.result) {
          console.log(event);
          const worlds = event.target.result as ISerializedGame[];

          const worldData = worlds.map((world) => ({
            gameId: world.gameId,
            name: world.name,
          }));

          resolve(worldData);
        }
      };
    });
  }

  async getGame(gameId: string): Promise<GameWrapper | null> {
    const foundGame: ISerializedGame | null = await new Promise((resolve) => {
      const transaction = this.db.transaction([
        ClientDbGamesService.WORLDS_OBS,
      ]);
      const objectStore = transaction.objectStore(
        ClientDbGamesService.WORLDS_OBS
      );

      const request = objectStore.get(gameId);

      request.onsuccess = (event: any) => {
        const data = event.target.result as ISerializedGame;
        if (!data) {
          resolve(null);
          return;
        }
        resolve(data);
      };
    });

    if (!foundGame) return null;

    return this.createGame(foundGame);
  }

  async saveGame(
    data: GameWrapper,
    terrainGen: TerrainGenerator,
    sandbox: any
  ) {
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db.transaction(
        [ClientDbGamesService.WORLDS_OBS],
        "readwrite"
      );
      const serializedGame = {
        gameId: data.game.id,
        name: data.game.name,
        entities: data.game.serialize_entities_wasm(),
        world: data.game.world.serialize_wasm(),
        terrainGen: terrainGen.serialize(),
        sandbox: sandbox,
      };

      console.log("Saving game", serializedGame);

      transaction.oncomplete = async () => {
        console.log("Saving game complete");
        resolve();
      };
      transaction.onerror = () => {
        console.log("There was an error", event);
        reject(event);
      };
      const objStore = transaction.objectStore(ClientDbGamesService.WORLDS_OBS);

      const result = objStore.put(serializedGame);
    });
  }

  async deleteGame(gameId: string) {
    const transaction = this.db.transaction(
      [ClientDbGamesService.WORLDS_OBS],
      "readwrite"
    );

    transaction.oncomplete = () => {
      console.log("All done!");
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction.onerror = (event: any) => {
      console.log("There was an error", event);
    };
    const objStore = transaction.objectStore("worlds");
    objStore.delete(gameId);
  }
}
