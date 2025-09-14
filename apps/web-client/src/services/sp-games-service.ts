import {
  IGameMetadata,
  ISerializedGame,
  deserializeGame,
  serializeGame,
} from "@craft/engine";
import { Game } from "@craft/rust-world";
import { MobileController } from "../controllers/playerControllers/mobileController";
import { KeyboardPlayerEntityController } from "../controllers/playerControllers/keyboardPlayerController";
import { getMyUid, IS_MOBILE } from "../utils";
import { EntityActionDto, SandBoxGScript } from "@craft/rust-world";
import { HudGScript } from "../renders/hud-renderer";
import { GameRenderer, GameRendererGameScript } from "../renders/game-renderer";

const log = (...message: any[]) => {
  console.log("sp-games-service.ts: ", ...message);
};

export interface RunningGame {
  game: Game;
  save: () => void;
  cleanup: () => void;
}

interface RunGameError {
  error: string;
}

export async function run(
  uiMessage: (message: string) => void,
  id?: string
): Promise<RunningGame | RunGameError> {
  log("Starting game", id);

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

  const mainPlayerUid = getMyUid();

  game.make_and_add_player_wasm(mainPlayerUid);
  game.update();

  // ===== Game Scripts =====
  log("Ensuring scripts");
  game.ensureScript(SandBoxGScript.name());
  game.ensureScript(GameRendererGameScript.name);

  async function task() {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  let running = true;

  log("Running scripts");

  game.run_scripts();

  let pendingChunkCount = game.getPendingChunkCount();
  const initialChunkCount = pendingChunkCount;
  // Load the initial chunks
  while (pendingChunkCount > 0) {
    log("Pending chunk count", pendingChunkCount);
    uiMessage(
      `Loading chunks... ${
        initialChunkCount - pendingChunkCount
      } / ${initialChunkCount}`
    );
    await task();
    await game.add_single_chunk();
    pendingChunkCount = game.getPendingChunkCount();
  }

  const gameRenderer = new GameRenderer(game, mainPlayerUid);

  const onAction = (action: EntityActionDto) => {
    game.handleAction(action);
  };

  const playerController = (() => {
    if (IS_MOBILE) {
      return new MobileController(onAction, mainPlayerUid);
    } else {
      return new KeyboardPlayerEntityController(
        game,
        onAction,
        () => {
          spGameService.saveGame(game);
        },
        mainPlayerUid,
        gameRenderer
      );
    }
  })();

  // Inital Render
  uiMessage("Painting the world...");
  await task();
  gameRenderer.update();

  const hudRender = new HudGScript(game, gameRenderer, mainPlayerUid);

  const update = async () => {
    const start = performance.now();
    game.handle_actions();
    game.run_scripts();
    await task();
    game.add_new_entities();
    await task();
    game.remove_entities();
    await game.add_single_chunk();
    game.add_blocks();
    await task();
    game.remove_blocks();
    await task();
    playerController.update();
    await task();
    gameRenderer.update();
    await task();
    hudRender.update(0);
    await task();
    gameRenderer.renderLoop(0);
    const end = performance.now();
    if (end - start > 50) {
      console.warn("Large update happened. Time: ", end - start);
    }
    if (running) {
      requestAnimationFrame(update);
    }
  };

  requestAnimationFrame(update);

  gameRenderer.renderLoop(0);

  return {
    game,
    save: () => {
      spGameService.saveGame(game);
    },
    cleanup: () => {
      running = false;
      gameRenderer.cleanup();
      hudRender.cleanup();
    },
  };
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
