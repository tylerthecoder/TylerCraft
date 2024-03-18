import { IGameData, WorldModule } from "@craft/engine";
import { ePickWorldScreen, eStartMenu, IExtendedWindow } from "./app";
import { ClientGame } from "./clientGame";

export class GameStarter {
  private game: ClientGame | null = null;

  public async start(gameData: IGameData) {
    await WorldModule.load();

    console.log("Loading game");
    this.game = await ClientGame.make(gameData);

    console.log("Game Loaded, Starting game", this.game);
    (window as IExtendedWindow).game = this.game;
    history.pushState("Game", "", `?worldId=${this.game.gameId}`);

    await this.game.baseLoad();
    console.log("Game Loaded");
    ePickWorldScreen.classList.add("fade");
    eStartMenu.classList.add("fade");
  }

  public async stop() {
    if (this.game) {
      this.game = null;
      console.log("Game stopped");
    }
  }
}
