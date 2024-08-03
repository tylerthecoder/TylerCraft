import {
  EntityController,
  PlayerActionService,
  WorldModule,
} from "@craft/engine";
import { IS_MOBILE, getMyUid } from "../app";
import { MobileController } from "../controllers/playerControllers/mobileController";
import { KeyboardPlayerEntityController } from "../controllers/playerControllers/keyboardPlayerController";
import { CanvasGameScript } from "../game-scripts/canvas-gscript";
import { GameScript } from "@craft/engine/game-script";
import { WebGlGScript } from "./webgl-gscript";
import { HudGScript } from "./hudRender";
import { Game, Player } from "@craft/rust-world";
import { GameWrapper, PlayerAction } from "@craft/engine/modules";

export class BasicGScript extends GameScript {
  name = "basic";

  public mainPlayer: Player;
  private entityControllers: Map<string, EntityController> = new Map();

  private makePlayerController(): EntityController {
    if (IS_MOBILE) {
      return new MobileController(
        this.playerActionService,
        this.game,
        this.mainPlayer
      );
      // } else if (canvas.isXr) {
      //   return new Quest2Controller(this.mainPlayer);
    } else {
      return new KeyboardPlayerEntityController(
        this.playerActionService,
        this.game,
        this.mainPlayer
      );
    }
  }

  playerActionService: PlayerActionService;

  constructor(public g: GameWrapper) {
    const game = WorldModule.createGame();

    super(g);
    console.log("Starting basic usecase");
    console.log("My UID", getMyUid());

    const player = WorldModule.createPlayer(Number(getMyUid()));
    this.mainPlayer = player;
    game.addPlayer(player);

    console.log("Main player", this.mainPlayer);

    this.playerActionService = new PlayerActionService(game);
  }

  onPlayerAction(action: PlayerAction) {
    this.game.handleAction(action);
  }

  setup() {
    console.log("Setting up basic game script");
    const webGlGScript = this.game.addGameScript(WebGlGScript);
    const canvasGScript = this.game.addGameScript(
      CanvasGameScript,
      webGlGScript,
      this
    );
    this.game.addGameScript(HudGScript, this, canvasGScript);

    const playerController = this.makePlayerController();

    this.entityControllers.set(this.mainPlayer.uid, playerController);
  }

  update() {
    for (const entityController of this.entityControllers.values()) {
      entityController.update();
    }
  }
}
