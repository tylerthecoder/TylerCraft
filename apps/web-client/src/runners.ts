import {
  CONFIG,
  EntityController,
  Game,
  GameAction,
  ISocketMessageType,
  Player,
  PlayerAction,
  SocketMessage,
} from "@craft/engine";
import { IS_MOBILE, SocketInterface, getMyUid } from "./app";
import { canvas } from "./canvas";
import { MouseAndKeyboardGameController } from "./controllers/gameKeyboardController";
import { SocketPlayerController } from "./controllers/playerControllers/socketPlayerController";
import { KeyboardPlayerEntityController } from "./controllers/playerControllers/keyboardPlayerController";
import { Quest2Controller } from "./controllers/playerControllers/quest2Controller";
import { MobileController } from "./controllers/playerControllers/mobileController";
import { CanvasRenderUsecase } from "./clientGame";

export class TimerRunner {
  private lastTime = Date.now();

  constructor(private game: Game) {
    // setInterval(this.update, 1000 / 40);
    setInterval(this.update.bind(this), 1000 / 4);
  }

  update() {
    console.log("Updating");
    const now = Date.now();
    const diff = now - this.lastTime;
    this.game.update(diff);
  }
}

export class MultiplayerUseCase {
  constructor(private game: Game, mainPlayer: Player) {
    game.addUpdateListener(this.update.bind(this));
    game.addGameActionListener(this.onGameAction.bind(this));
    mainPlayer.addActionListener(this.onPlayerAction.bind(this));

    SocketInterface.addListener(this.onSocketMessage.bind(this));

    game.entities.getActivePlayers().forEach((player) => {
      if (player.uid === getMyUid()) return;
      game.entityControllers.set(player.uid, [
        new SocketPlayerController(game, player),
      ]);
    });
  }

  onGameAction(action: GameAction) {
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.actions, action.getDto())
    );
  }

  onPlayerAction(action: PlayerAction) {
    SocketPlayerController.sendPlayerAction(action);
  }

  onSocketMessage(message: SocketMessage) {
    if (message.isType(ISocketMessageType.gameDiff)) {
      this.game.handleStateDiff(message.data);
    }
  }

  update(_delta: number) {
    const diff = this.game.stateDiff;

    for (const entityId of diff.getNewEntities()) {
      if (entityId === getMyUid()) continue;
      const entity = this.game.entities.get(entityId);
      if (entity instanceof Player) {
        this.game.entityControllers.set(entityId, [
          new SocketPlayerController(this.game, entity),
        ]);
      }
    }
  }
}

export class BasicUsecase {
  private mainPlayer: Player;

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

    console.log("Main player pos", this.mainPlayer.pos);

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
