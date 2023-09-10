import {
  Game,
  IGameMetadata,
  ISerializedGame,
  IGameManager,
  Chunk,
  ISerializedChunk,
  Vector2D,
  WorldModule,
  IConfig,
  IChunkReader,
  ICreateGameOptions,
  IGameData,
  IGameSaver,
} from "@craft/engine";
import { TerrainGenModule } from "@craft/engine/modules";
import TerrainWorker from "../workers/terrain.worker?worker";

const USE_WASM_CHUNK_GETTER = false;

const WasmChunkGetter = (config: IConfig): IChunkReader => {
  console.log("WasmChunkGetter", config);
  return {
    getChunk: async (chunkPos: string) => {
      const terrainVector = Vector2D.fromIndex(chunkPos);
      await TerrainGenModule.load();
      return TerrainGenModule.genChunk(terrainVector);
    },
  };
};

const WorkerChunkGetter = (config: IConfig): IChunkReader => {
  const worker = new TerrainWorker();
  console.log("The worker", worker);
  worker.postMessage({
    type: "setConfig",
    config,
  });
  worker.onerror = (e) => {
    console.error("Error from worker", e);
  };
  worker.onmessageerror = (e) => {
    console.error("Message error from worker", e);
  };
  const chunkPromises: { [chunkPos: string]: Promise<Chunk> } = {};
  return {
    getChunk: async (chunkPos: string) => {
      console.log("WorkerChunkGetter", chunkPos);

      let chunkPromise = chunkPromises[chunkPos];
      if (chunkPromise) return chunkPromise;

      const terrainVector = Vector2D.fromIndex(chunkPos);
      worker.postMessage({
        type: "getChunk",
        x: terrainVector.data[0],
        y: terrainVector.data[1],
      });

      chunkPromise = new Promise<Chunk>((resolve) => {
        const onTerrainMessage = (data: { data: ISerializedChunk }) => {
          if (data.data.chunkId !== chunkPos) return;

          const chunk = WorldModule.createChunkFromSerialized(data.data);

          resolve(chunk);
          worker.removeEventListener("message", onTerrainMessage);
        };

        worker.addEventListener("message", onTerrainMessage);
      });
      chunkPromises[chunkPos] = chunkPromise;

      return chunkPromise;
    },
  };
};

export class ClientDbGameManger implements IGameManager {
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

    return new ClientDbGameManger(db);
  }

  private constructor(private db: IDBDatabase) {}

  private getChunkReader = async (config: IConfig): Promise<IChunkReader> => {
    if (USE_WASM_CHUNK_GETTER) {
      return WasmChunkGetter(config);
    } else {
      const chunkGetter = WorkerChunkGetter(config);
      // wait for worker to load, need sto be a way to listen for this
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return chunkGetter;
    }
  };

  private getGameSaver = (): IGameSaver => {
    return {
      save: async (game: Game) => {
        this.saveGame(game);
      },
    };
  };

  async createGame(createGameOptions: ICreateGameOptions): Promise<IGameData> {
    return {
      id: String(Math.random()),
      chunkReader: await this.getChunkReader(createGameOptions.config),
      gameSaver: this.getGameSaver(),
      name: createGameOptions.name,
      config: createGameOptions.config,
    };
  }

  getAllGames(): Promise<IGameMetadata[]> {
    return new Promise((resolve) => {
      const transaction = this.db.transaction([ClientDbGameManger.WORLDS_OBS]);
      const objectStore = transaction.objectStore(
        ClientDbGameManger.WORLDS_OBS
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

  async getGame(gameId: string): Promise<IGameData | null> {
    const world: ISerializedGame | null = await new Promise((resolve) => {
      const transaction = this.db.transaction([ClientDbGameManger.WORLDS_OBS]);
      const objectStore = transaction.objectStore(
        ClientDbGameManger.WORLDS_OBS
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

    if (!world) return null;

    // later have an entire object store to keep chunks in.
    const chunkMap = new Map<string, ISerializedChunk>();
    for (const chunk of world.world.chunks) {
      chunkMap.set(chunk.chunkId, chunk);
    }

    return {
      data: {
        gameId: world.gameId,
        config: world.config,
        entities: world.entities,
        world: {
          chunks: [],
        },
        name: world.name,
      },
      gameSaver: this.getGameSaver(),
      config: world.config,
      chunkReader: await this.getChunkReader(world.config),
      activePlayers: [],
      id: gameId,
      name: world.name,
    };
  }

  async saveGame(data: Game) {
    const transaction = this.db.transaction(
      [ClientDbGameManger.WORLDS_OBS],
      "readwrite"
    );

    console.log("Saving game", data);

    transaction.oncomplete = () => {
      console.log("All done!");
    };
    transaction.onerror = () => {
      console.log("There was an error", event);
    };
    const objStore = transaction.objectStore("worlds");

    objStore.put(data.serialize());
  }

  async deleteGame(gameId: string) {
    const transaction = this.db.transaction(
      [ClientDbGameManger.WORLDS_OBS],
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
