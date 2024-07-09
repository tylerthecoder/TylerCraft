import {
  EntityController,
  Game,
  Player,
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
import { AiAgentController } from "./ai-agent";

export class BasicUsecase implements IGameScript {
  public mainPlayer: Player;
  private gameController: MouseAndKeyboardGameController;
  private entityControllers: Map<string, EntityController> = new Map();

  private makePlayerController(): EntityController {
    if (IS_MOBILE) {
      return new MobileController(
        this.playerActionService,
        this.game,
        this.mainPlayer
      );
    } else if (canvas.isXr) {
      return new Quest2Controller(this.mainPlayer);
    } else {
      return new KeyboardPlayerEntityController(
        this.playerActionService,
        this.game,
        this.mainPlayer
      );
    }
  }

  actions? = {
    "make-ai-agent": () => this.makeAiAgent(),
  };

  private makeAiAgent() {
    const player = this.game.addPlayer("ai");

    this.entityControllers.set(
      player.uid,
      new AiAgentController(this.playerActionService, this.game, player)
    );
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
  game.startTimer();
};
