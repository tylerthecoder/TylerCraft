import { GameController, IWorldData, WorldModel } from "@craft/engine";
import {
  ePickWorldScreen,
  eStartMenu,
  IExtendedWindow,
  IS_MOBILE,
} from "./app";
import { canvas } from "./canvas";
import { ClientGame } from "./clientGame";
import { MouseAndKeyController } from "./controllers/gameKeyboardController";
import { MobileController } from "./controllers/mobileController";
import { Quest2Controller } from "./controllers/quest2Controller";

export class GameStarter {
  private game: ClientGame | null = null;

  private static getController(clientGame: ClientGame): GameController {
    const getClass = () => {
      if (IS_MOBILE) {
        return MobileController;
      } else if (canvas.isXr) {
        return Quest2Controller;
      } else {
        return MouseAndKeyController;
      }
    };

    return new (getClass())(clientGame);
  }

  public async start(worldModel: WorldModel, worldData: IWorldData) {
    console.log("Loading game");
    this.game = await ClientGame.make(worldData, worldModel);

    console.log("Game Loaded, Starting game", this.game);
    (window as IExtendedWindow).game = this.game;
    history.pushState("Game", "", `?worldId=${this.game.gameId}`);

    await this.game.baseLoad();
    console.log("Game Loaded");
    ePickWorldScreen.classList.add("fade");
    eStartMenu.classList.add("fade");
  }
}
