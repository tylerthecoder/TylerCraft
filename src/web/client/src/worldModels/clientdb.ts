import { Game, IGameMetadata, ISerializedGame, ICreateWorldOptions, INullableChunkReader, IWorldData, WorldModel, Chunk, ISerializedChunk, ChunkReader, Vector2D, WorldModule } from "@craft/engine";
import TerrainWorker from "worker-loader!@craft/terrain-gen-worker/terrain.worker";

export class ClientDb extends WorldModel {

  private terrainWorker: TerrainWorker;

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
          db.createObjectStore(this.WORLDS_OBS, { keyPath: "gameId", autoIncrement: true });

          // objectStore.createIndex("name", "name", { unique: false });
        }
        // add a "name" properties to worlds and make it searchable
      };
    });

    return new ClientDb(db);
  }

  private constructor(
    private db: IDBDatabase,
  ) {
    super();
    this.terrainWorker = new TerrainWorker();
  }

  async createWorld(createWorldOptions: ICreateWorldOptions): Promise<IWorldData> {
    const worldId = Math.random() + "";

    const chunkPromises: { [chunkPos: string]: Promise<Chunk> } = {};

    this.terrainWorker.postMessage({
      type: "setConfig",
      config: createWorldOptions.config,
    });

    const chunkReader: INullableChunkReader = {
      getChunk: async (chunkPos) => {
        let chunkPromise = chunkPromises[chunkPos];
        if (chunkPromise) return chunkPromise;

        const terrainVector = Vector2D.fromIndex(chunkPos);
        this.terrainWorker.postMessage({
          type: "getChunk",
          x: terrainVector.data[0],
          y: terrainVector.data[1],
        });

        chunkPromise = new Promise<Chunk>(resolve => {
          const onTerrainMessage = (data: { data: ISerializedChunk }) => {
            if (data.data.chunkId !== chunkPos) return;

            const chunk = WorldModule.createChunkFromSerialized(data.data);

            resolve(chunk);
            this.terrainWorker.removeEventListener("message", onTerrainMessage);
          }

          this.terrainWorker.addEventListener("message", onTerrainMessage);
        });
        chunkPromises[chunkPos] = chunkPromise;

        return chunkPromise;
      }
    };
    return {
      worldId,
      name: createWorldOptions.gameName,
      chunkReader: new ChunkReader(chunkReader),
      config: createWorldOptions.config,
    }
  }

  getAllWorlds(): Promise<IGameMetadata[]> {
    return new Promise((resolve) => {
      const transaction = this.db.transaction([ClientDb.WORLDS_OBS]);
      const objectStore = transaction.objectStore(ClientDb.WORLDS_OBS);

      const getAllRequest = objectStore.getAll();
      getAllRequest.onsuccess = (event: any) => {
        if (event.target.result) {
          console.log(event);
          const worlds = event.target.result as ISerializedGame[];

          const worldData = worlds.map(world => ({
            gameId: world.gameId,
            name: world.name,
          }));

          resolve(worldData);
        }
      }
    });
  }

  async getWorld(worldId: string): Promise<IWorldData> {
    const world: ISerializedGame = await new Promise((resolve) => {
      const transaction = this.db.transaction([ClientDb.WORLDS_OBS]);
      const objectStore = transaction.objectStore(ClientDb.WORLDS_OBS);

      const request = objectStore.get(worldId);

      request.onsuccess = (event: any) => {
        const data = event.target.result as ISerializedGame;

        resolve(data)
      }
    });

    // later have an entire object store to keep chunks in.
    const chunkMap = new Map<string, ISerializedChunk>();
    for (const chunk of world.world.chunks) {
      chunkMap.set(chunk.chunkId, chunk);
    }

    const chunkReader: INullableChunkReader = {
      getChunk: async (chunkPos) => {
        const serializedChunk = chunkMap.get(chunkPos);

        if (serializedChunk) return WorldModule.createChunkFromSerialized(serializedChunk);

        const terrainVector = Vector2D.fromIndex(chunkPos);
        this.terrainWorker.postMessage({
          x: terrainVector.data[0],
          y: terrainVector.data[1],
        });
        return new Promise(resolve => {
          this.terrainWorker.addEventListener("message", (data: { data: ISerializedChunk }) => {
            const chunk = WorldModule.createChunkFromSerialized(data.data);

            resolve(chunk);
          })
        });
      }
    };

    return {
      data: {
        gameId: world.gameId,
        config: world.config,
        entities: world.entities,
        world: {
          chunks: [],
          // tg: {
          //   blocksToRender: []
          // }
        },
        name: world.name,
      },
      config: world.config,
      chunkReader: new ChunkReader(chunkReader),
      activePlayers: [],
      worldId,
      name: world.name,
    }
  }

  async saveWorld(data: Game) {
    const transaction = this.db.transaction([ClientDb.WORLDS_OBS], "readwrite");

    console.log(data);

    transaction.oncomplete = () => {
      console.log("All done!");
    };
    transaction.onerror = () => {
      console.log("There was an error", event);
    }
    const objStore = transaction.objectStore("worlds");

    objStore.put(data.serialize());
  }

  async deleteWorld(gameId: string) {
    const transaction = this.db.transaction([ClientDb.WORLDS_OBS], "readwrite");

    transaction.oncomplete = () => {
      console.log("All done!");
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction.onerror = (event: any) => {
      console.log("There was an error", event);
    }
    const objStore = transaction.objectStore("worlds");
    objStore.delete(gameId);
  }
}
