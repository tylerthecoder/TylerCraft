import {
  IGameMetadata,
  ISocketWelcomePayload,
  ICreateGameOptions,
  Game,
  GameAction,
  ISocketMessageType,
  PlayerAction,
  SocketMessage,
  IGamesService,
  IContructGameOptions,
} from "@craft/engine";
import { SocketListener } from "../socket";
import { SocketInterface, getMyUid } from "../app";
import { ApiService } from "../services/api-service";
import { GameScript } from "@craft/engine/game-script";
import { BasicGScript } from "../game-scripts/basic-gscript";

export class NetworkGamesService implements IGamesService {
  private async waitForWelcomeMessage() {
    let listener: SocketListener | null = null;
    const welcomeMessage: ISocketWelcomePayload | null = await new Promise(
      (resolve) => {
        listener = (message) => {
          if (message.isType(ISocketMessageType.welcome)) {
            resolve(message.data);
          } else if (message.isType(ISocketMessageType.worldNotFound)) {
            resolve(null);
            console.error("Requested world not found");
          }
        };
        SocketInterface.addListener(listener);
      }
    );
    SocketInterface.removeListener(listener!);
    return welcomeMessage;
  }

  private async buildGame(constructGame: IContructGameOptions) {
    const gameSaver = {
      save: async (game: Game) => {
        this.saveGame(game);
      },
    };

    const game = Game.make(constructGame, gameSaver);

    const basic = game.addGameScript(BasicGScript);
    game.addGameScript(ServerSideGameScript, basic);

    return game;
  }

  public async createGame(options: ICreateGameOptions): Promise<Game> {
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.newWorld, {
        myUid: getMyUid(),
        ...options,
      })
    );

    console.log("Creating world");

    const welcomeMessage = await this.waitForWelcomeMessage();

    if (!welcomeMessage) {
      throw new Error("Server didn't create the world");
    }

    console.log("Welcome Message", welcomeMessage);

    return this.buildGame(welcomeMessage.game);
  }

  public async getGame(gameId: string): Promise<Game | null> {
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.joinWorld, {
        worldId: gameId,
        myUid: getMyUid(),
      })
    );

    const welcomeMessage = await this.waitForWelcomeMessage();

    if (!welcomeMessage) {
      return null;
    }

    return this.buildGame(welcomeMessage.game);
  }

  public async getAllGames(): Promise<IGameMetadata[]> {
    return await ApiService.getWorlds();
  }

  // we might not have to send the data to the server here. Just tell the server that we want to save and it will
  // use its local copy of the game to save
  public async saveGame(gameData: Game): Promise<void> {
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.saveWorld, {
        worldId: gameData.gameId,
      })
    );
  }

  public async deleteGame(_gameId: string) {
    // TO-DO implement this (REST)
  }
}

export class ServerSideGameScript extends GameScript {
  name = "server-side";

  debug = true;

  constructor(game: Game, private basic: BasicGScript) {
    super(game);
  }

  setup() {
    console.log("Setting up ServerSideGameScript");
    SocketInterface.addListener(this.onSocketMessage.bind(this));

    this.basic.playerActionService.addActionListener(
      this.basic.mainPlayer.uid,
      this.onPlayerAction.bind(this)
    );
  }

  onGameAction(action: GameAction) {
    if (this.debug) {
      console.log("Sending game action", action);
    }
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.actions, action.getDto())
    );
  }

  onPlayerAction(action: PlayerAction) {
    if (this.debug) {
      console.log("Sending player action", action);
    }
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.playerActions, action.getDto())
    );
  }

  private onSocketMessage(message: SocketMessage) {
    console.log("MP: Got message", message);
    const mainPlayer = this.basic.mainPlayer;
    const playerActionService = this.basic.playerActionService;

    if (message.isType(ISocketMessageType.gameDiff)) {
      this.game.handleStateDiff(message.data);
    } else if (message.isType(ISocketMessageType.playerActions)) {
      if (message.data.data.playerUid === mainPlayer.uid) return;

      const playerAction = new PlayerAction(
        message.data.type,
        message.data.data
      );

      playerActionService.performAction(playerAction);
    }
  }
}
