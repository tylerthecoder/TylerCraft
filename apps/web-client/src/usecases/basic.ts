import {
  CONFIG,
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
import { CanvasRenderUsecase } from "./canvas-usecase";

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

export class BasicUsecase {
  public mainPlayer: Player;
  private renderUsecase: CanvasRenderUsecase;

  private makePlayerController(): EntityController {
    const onPlayerAction = (action: PlayerAction) => {
      this.playerActionService.performAction(this.mainPlayer.uid, action);
    };

    if (IS_MOBILE) {
      return new MobileController(
        this.mainPlayer,
        onPlayerAction,
        this.renderUsecase
      );
    } else if (canvas.isXr) {
      return new Quest2Controller(this.mainPlayer);
    } else {
      return new KeyboardPlayerEntityController(
        this.mainPlayer,
        onPlayerAction,
        this.renderUsecase
      );
    }
  }

  playerActionService: PlayerActionService;

  constructor(public game: Game) {
    console.log("Starting basic usecase");
    console.log("My UID", getMyUid());
    game.addUpdateListener(this.update.bind(this));
    this.mainPlayer = game.addPlayer(getMyUid());
    console.log("Main player", this.mainPlayer);

    this.renderUsecase = new CanvasRenderUsecase(game, this.mainPlayer);

    game.gameController = new MouseAndKeyboardGameController(game);

    this.playerActionService = new PlayerActionService(game);
    const playerController = this.makePlayerController();
    game.entityControllers.set(this.mainPlayer.uid, [playerController]);
  }

  update() {
    // Load chunks around the player
    if (CONFIG.terrain.infiniteGen) {
      this.game.world.loadChunksAroundPoint(this.mainPlayer.pos);
    }
  }
}
