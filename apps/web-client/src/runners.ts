import { CONFIG, EntityController, Game, Player } from "@craft/engine";
import { IS_MOBILE, getMyUid } from "./app";
import { canvas } from "./canvas";
import { MouseAndKeyboardGameController } from "./controllers/gameKeyboardController";
import { KeyboardPlayerEntityController } from "./controllers/playerControllers/keyboardPlayerController";
import { Quest2Controller } from "./controllers/playerControllers/quest2Controller";
import { MobileController } from "./controllers/playerControllers/mobileController";
import { CanvasRenderUsecase } from "./clientGame";

export class TimerRunner {
  private lastTime = Date.now();

  constructor(private game: Game) {
    setInterval(this.update.bind(this), 1000 / 40);
    // setInterval(this.update.bind(this), 1000 / 4);
  }

  update() {
    const now = Date.now();
    const diff = now - this.lastTime;
    this.game.update(diff);
    this.lastTime = now;
  }
}

export class BasicUsecase {
  public mainPlayer: Player;

  private renderUsecase: CanvasRenderUsecase;

  private makePlayerController(): EntityController {
    if (IS_MOBILE) {
      return new MobileController(this, this.mainPlayer);
    } else if (canvas.isXr) {
      return new Quest2Controller(this.mainPlayer);
    } else {
      return new KeyboardPlayerEntityController(
        this.mainPlayer,
        this.renderUsecase
      );
    }
  }

  constructor(private game: Game) {
    console.log("Starting basic usecase");
    console.log("My UID", getMyUid());
    game.addUpdateListener(this.update.bind(this));
    this.mainPlayer = game.addPlayer(getMyUid());
    console.log("Main player", this.mainPlayer);

    this.renderUsecase = new CanvasRenderUsecase(game, this.mainPlayer);

    game.gameController = new MouseAndKeyboardGameController(game);

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
