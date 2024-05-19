import {
  CONFIG,
  EntityController,
  Game,
  Player,
  PlayerAction,
  PlayerActionService,
  TerrainGen2,
} from "@craft/engine";
import { IS_MOBILE, getMyUid } from "../app";
import { MobileController } from "../controllers/playerControllers/mobileController";
import { Quest2Controller } from "../controllers/playerControllers/quest2Controller";
import { KeyboardPlayerEntityController } from "../controllers/playerControllers/keyboardPlayerController";
import { canvas } from "../canvas";
import { MouseAndKeyboardGameController } from "../controllers/gameKeyboardController";
import { IGameScript } from "@craft/engine/game-script";
import { CanvasGameScript } from "../game-scripts/canvas-gscript";
import { ServerSideGameScript } from "../services/mp-games-service";

// const WorkerChunkGetter = (config: IConfig): IChunkReader => {
//   const worker = new TerrainWorker();
//   console.log("The worker", worker);
//   worker.postMessage({
//     type: "setConfig",
//     config,
//   });
//   worker.onerror = (e) => {
//     console.error("Error from worker", e);
//   };
//   worker.onmessageerror = (e) => {
//     console.error("Message error from worker", e);
//   };
//   const chunkPromises: { [chunkPos: string]: Promise<Chunk> } = {};
//   return {
//     getChunk: async (chunkPos: string) => {
//       console.log("WorkerChunkGetter", chunkPos);
//
//       let chunkPromise = chunkPromises[chunkPos];
//       if (chunkPromise) return chunkPromise;
//
//       const terrainVector = Vector2D.fromIndex(chunkPos);
//       worker.postMessage({
//         type: "getChunk",
//         x: terrainVector.data[0],
//         y: terrainVector.data[1],
//       });
//
//       chunkPromise = new Promise<Chunk>((resolve) => {
//         const onTerrainMessage = (data: { data: ISerializedChunk }) => {
//           if (data.data.chunkId !== chunkPos) return;
//
//           const chunk = WorldModule.createChunkFromSerialized(data.data);
//
//           resolve(chunk);
//           worker.removeEventListener("message", onTerrainMessage);
//         };
//
//         worker.addEventListener("message", onTerrainMessage);
//       });
//       chunkPromises[chunkPos] = chunkPromise;
//
//       return chunkPromise;
//     },
//   };
// };

export class TimerRunner {
  private lastTime = Date.now();

  constructor(private game: Game) {
    setInterval(this.update.bind(this), 1000 / 40);
  }

  update() {
    const now = Date.now();
    const diff = now - this.lastTime;
    // if we leave the tab for a long time delta gets very big, and the play falls out of the world.
    // I'm just going to make them not move for now, but I need to remove make the system more tollerant of large deltas
    if (diff > 100) {
      console.log("Skipping update, time diff is too large", diff);
      this.lastTime = now;
      return;
    }
    this.game.update(diff);
    this.lastTime = now;
  }
}

export class BasicUsecase implements IGameScript {
  public mainPlayer: Player;
  private gameController: MouseAndKeyboardGameController;
  private entityControllers: Map<string, EntityController> = new Map();

  private makePlayerController(
    canvasGameScript: CanvasGameScript
  ): EntityController {
    const onPlayerAction = (action: PlayerAction) => {
      this.playerActionService.performAction(this.mainPlayer.uid, action);
    };

    if (IS_MOBILE) {
      return new MobileController(
        this.mainPlayer,
        onPlayerAction,
        canvasGameScript
      );
    } else if (canvas.isXr) {
      return new Quest2Controller(this.mainPlayer);
    } else {
      return new KeyboardPlayerEntityController(
        this.mainPlayer,
        onPlayerAction,
        canvasGameScript
      );
    }
  }

  playerActionService: PlayerActionService;

  constructor(public game: Game) {
    console.log("Starting basic usecase");
    console.log("My UID", getMyUid());

    this.mainPlayer = game.addPlayer(getMyUid());

    console.log("Main player", this.mainPlayer);

    this.gameController = new MouseAndKeyboardGameController(game);
    this.playerActionService = new PlayerActionService(game);
  }

  async setup() {
    console.log("Setting up basic game script");
    const canvasGameScript = this.game.addGameScript(CanvasGameScript);
    const playerController = this.makePlayerController(canvasGameScript);
    this.entityControllers.set(this.mainPlayer.uid, playerController);

    if (!this.game.hasScript(ServerSideGameScript)) {
      this.game.world.chunks.chunkReader = new TerrainGen2(this.game.config);
    }
  }

  update(delta: number) {
    // Load chunks around the player
    if (CONFIG.terrain.infiniteGen) {
      this.game.world.loadChunksAroundPoint(this.mainPlayer.pos);
    }

    this.gameController.update(delta);

    for (const entityController of this.entityControllers.values()) {
      entityController.update();
    }
  }
}

export const SandboxUseCase = async (game: Game) => {
  console.log("Starting sandbox usecase", game);

  game.addGameScript(BasicUsecase);

  await game.setupScripts();

  new TimerRunner(game);
};
