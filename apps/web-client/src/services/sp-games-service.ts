import {
  IGameMetadata,
  ISerializedGame,
  deserializeGame,
  serializeGame,
} from "@craft/engine";
import { Game } from "@craft/rust-world";
import { getMyUid, task } from "../utils";
import { SandBoxGScript } from "@craft/rust-world";
import { GameRendererGameScript } from "../renders/game-renderer";
import {
  addGameRenderer,
  addHudRenderer,
  addPlayerController,
  loadInitialChunks,
  RunningGame,
} from "./running-game";
import { RunGameError } from "./running-game";

const log = (...message: any[]) => {
  console.log("sp-games-service.ts: ", ...message);
};

export async function run(
  uiMessage: (message: string) => void,
  id?: string
): Promise<RunningGame | RunGameError> {
  log("Starting game", id);

  // ===== Getting or Creating Game =====
  let game: Game | null = null;
  uiMessage("Checking records...");

  if (id) {
    const serializedGame = await spGameService.getGame(id);
    if (!serializedGame) {
      return {
        error: "Game with id " + id + " not found",
      };
    }

    const start = performance.now();
    game = deserializeGame(serializedGame);
    const end = performance.now();
    log("Deserialized game in", end - start, "ms");
  } else {
    log("Creating new game");
    const start = performance.now();
    game = new Game();
    const end = performance.now();
    log("Created new game in", end - start, "ms");
  }
  log("The Game", game);
  (window as any).game = game;

  // ===== Game Scripts =====
  log("Ensuring scripts");
  game.ensureScript(SandBoxGScript.name());
  game.ensureScript(GameRendererGameScript.name);

  // ===== Main Player =====
  const mainPlayerUid = getMyUid();
  game.makeAndAddPlayer(mainPlayerUid);
  game.update();

  // ===== Running Game =====
  const runningGame = new RunningGame(game, mainPlayerUid);

  // ===== Load Initial Chunks =====
  await loadInitialChunks(runningGame, uiMessage);

  // ===== Game Renderer =====
  const gameRenderer = await addGameRenderer(runningGame, uiMessage);

  // ===== Player Controller =====
  // TODO: Remove the gameRenderer requirement so we can do this earlier on
  addPlayerController(runningGame, gameRenderer);

  // ===== Hud Renderer =====
  // TODO: Remove the gameRenderer requirement so we can do this earlier on
  addHudRenderer(runningGame, gameRenderer);

  // ===== Add Saving =====
  runningGame.saveListeners.addListener(() => {
    spGameService.saveGame(game);
  }, "save");

  // ===== Start Game =====
  runningGame.start();

  return runningGame;
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

  private constructor(private db: IDBDatabase) {}

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

  async hasGame(gameId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [ClientDbGamesService.WORLDS_OBS],
        "readonly"
      );
      const objectStore = transaction.objectStore(
        ClientDbGamesService.WORLDS_OBS
      );

      // `getKey` is supported in modern browsers, lighter than `get`
      const request = objectStore.getKey(gameId);

      request.onsuccess = (event: any) => {
        resolve(event.target.result !== undefined); // key exists if result is not undefined
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getGame(gameId: string): Promise<ISerializedGame | null> {
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

    return foundGame;
  }

  async saveGame(data: Game) {
    log("Saving game", data);
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db.transaction(
        [ClientDbGamesService.WORLDS_OBS],
        "readwrite"
      );
      const serializedGame = serializeGame(data);

      transaction.oncomplete = async () => {
        log("Saving game complete");
        resolve();
      };
      transaction.onerror = () => {
        console.log("There was an error", event);
        reject(event);
      };
      const objStore = transaction.objectStore(ClientDbGamesService.WORLDS_OBS);

      objStore.put(serializedGame);
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

export const spGameService = await ClientDbGamesService.factory();
