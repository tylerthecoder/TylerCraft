import {
  EntityController,
  Game,
  Player,
  PlayerAction,
  PlayerActionService,
} from "@craft/engine";
import { IS_MOBILE, getMyUid } from "../app";
import { MobileController } from "../controllers/playerControllers/mobileController";
import { Quest2Controller } from "../controllers/playerControllers/quest2Controller";
import { KeyboardPlayerEntityController } from "../controllers/playerControllers/keyboardPlayerController";
import { canvas } from "../canvas";
import { MouseAndKeyboardGameController } from "../controllers/gameKeyboardController";
import { IGameScript } from "@craft/engine/game-script";
import { CanvasGameScript } from "../game-scripts/canvas-gscript";

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

  private makePlayerController(): EntityController {
    const onPlayerAction = (action: PlayerAction) => {
      this.playerActionService.performAction(this.mainPlayer.uid, action);
    };

    if (IS_MOBILE) {
      return new MobileController(this.game, this.mainPlayer, onPlayerAction);
    } else if (canvas.isXr) {
      return new Quest2Controller(this.mainPlayer);
    } else {
      return new KeyboardPlayerEntityController(
        this.game,
        this.mainPlayer,
        onPlayerAction
      );
    }
  }

  private makeAiAgent() {}

  playerActionService: PlayerActionService;

  constructor(public game: Game) {
    console.log("Starting basic usecase");
    console.log("My UID", getMyUid());

    this.mainPlayer = game.addPlayer(getMyUid());

    console.log("Main player", this.mainPlayer);

    this.gameController = new MouseAndKeyboardGameController(game);
    this.playerActionService = new PlayerActionService(game);
  }

  setup() {
    console.log("Setting up basic game script");
    this.game.addGameScript(CanvasGameScript);
    const playerController = this.makePlayerController();
    this.entityControllers.set(this.mainPlayer.uid, playerController);
  }

  update(delta: number) {
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
