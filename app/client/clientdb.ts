import { Game, ISerializedGame } from "../src/game";

export class ClientDb {
  private db: IDBDatabase;

  private WORLDS_OBS = "worlds";

  constructor() {
    this.loadDb();
  }

  async loadDb() {
    return new Promise((resolve, reject) => {
      const openRequest = window.indexedDB.open("TylerCraftDB", 4);
      openRequest.onerror = function(event: any) {
        // Do something with request.errorCode!
        console.log(event.target);
        console.error("Database error: " + event.target.errorCode);
        reject(event.target);
      };
      openRequest.onsuccess = (event: any) => {
        // Do something with request.result!
        this.db = event.target.result;
        resolve();
      };
      openRequest.onupgradeneeded = () => {
        console.log("Upgrading database");
        // Save the IDBDatabase interface
        var db = openRequest.result;
        // Create an objectStore for this database
        // world id will be the property on the world object used to identify the world
        if (!db.objectStoreNames.contains(this.WORLDS_OBS)) {
          var objectStore = db.createObjectStore(this.WORLDS_OBS, { keyPath: "gameId", autoIncrement: true });

          // objectStore.createIndex("name", "name", { unique: false });
        }
        // add a "name" properties to worlds and make it searchable
      };
    });
  }

  getSavedGames(): Promise<ISerializedGame[]> {
    return new Promise((resolve,reject) => {
      const transaction = this.db.transaction([this.WORLDS_OBS]);
      const objectStore = transaction.objectStore(this.WORLDS_OBS);

      const request = objectStore.getAll();

      request.onerror = (event) => {
        reject(event);
      }

      request.onsuccess = (event) => {
        resolve(request.result);
      }
    });
  }

  writeGameData(data: Game) {
    const transaction = this.db.transaction([this.WORLDS_OBS], "readwrite");

    transaction.oncomplete = (event: any) => {
      console.log("All done!");
    };
    transaction.onerror = (event: any) => {
      console.log("There was an error", event);
    }
    const objStore = transaction.objectStore("worlds");
    const worldData = data.serialize();

    objStore.put(worldData);
  }

  deleteGame(gameId: string) {
    const transaction = this.db.transaction([this.WORLDS_OBS], "readwrite");

    transaction.oncomplete = (event: any) => {
      console.log("All done!");
    };
    transaction.onerror = (event: any) => {
      console.log("There was an error", event);
    }
    const objStore = transaction.objectStore("worlds");
    objStore.delete(gameId);
  }
}
