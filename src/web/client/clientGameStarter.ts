import { IWorldData, WorldModel } from "@craft/engine/types";
import { ePickWorldScreen, eStartMenu, IExtendedWindow, IS_MOBILE } from "./app";
import { canvas } from "./canvas"
import { ClientGame } from "./clientGame";
import { GameController } from "@craft/engine/controllers/controller";
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
		}
		return new (getClass())(clientGame);
	}

	public async start(
		worldModel: WorldModel,
		worldData: IWorldData,
	) {
		console.log("Loading Canvas");
		console.log("Canvas Loaded");

		this.game = new ClientGame(worldModel, worldData);

		console.log("Starting game", this.game);
		(window as IExtendedWindow).game = this.game;
		history.pushState("Game", "", `?worldId=${this.game.gameId}`);

		await this.game.baseLoad();
		console.log("Game Loaded");
		ePickWorldScreen.classList.add("fade");
		eStartMenu.classList.add("fade");
	}
}

