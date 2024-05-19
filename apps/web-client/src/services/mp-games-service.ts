import {
  IGameMetadata,
  Chunk,
  ISocketWelcomePayload,
  IChunkReader,
  WorldModule,
  ICreateGameOptions,
  Game,
  GameAction,
  ISocketMessageType,
  PlayerAction,
  SocketMessage,
  IGamesService,
  Player,
  PlayerActionService,
} from "@craft/engine";
import { SocketListener } from "../socket";
import { SocketInterface, getMyUid } from "../app";
import { ApiService } from "../services/api-service";
import { IGameScript } from "@craft/engine/game-script";
import { BasicUsecase } from "../usecases/sandbox";

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

  private async makeGame(welcomeMessage: ISocketWelcomePayload): Promise<Game> {
    const gameSaver = {
      save: async (game: Game) => {
        this.saveGame(game);
      },
    };

    const game = Game.make(
      welcomeMessage.game,
      new ServerChunkReader(),
      gameSaver
    );

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

    return this.makeGame(welcomeMessage);
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

    return this.makeGame(welcomeMessage);
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

class ServerChunkReader implements IChunkReader {
  // send a socket message asking for the chunk then wait for the reply
  // this could also be a rest endpoint but that isn't as fun :) Plus the socket already has some identity to it
  async getChunk(chunkPos: string) {
    // send the socket message
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.getChunk, {
        pos: chunkPos,
      })
    );

    let listener: SocketListener | null = null;
    const chunk: Chunk = await new Promise((resolve) => {
      listener = (message) => {
        if (message.isType(ISocketMessageType.setChunk)) {
          const { pos, data } = message.data;
          if (pos !== chunkPos) return;
          const chunk = WorldModule.createChunkFromSerialized(data);
          resolve(chunk);
        }
      };
      SocketInterface.addListener(listener);
    });
    if (listener) {
      SocketInterface.removeListener(listener);
    }

    return chunk;
  }
}
export class MultiplayerGameScript implements IGameScript {
  debug = true;
  private mainPlayer: Player;
  private playerActionService: PlayerActionService;

  constructor(private game: Game) {
    this.mainPlayer = game.getGameScript(BasicUsecase).mainPlayer;
    this.playerActionService =
      game.getGameScript(BasicUsecase).playerActionService;

    this.playerActionService.addActionListener(
      this.mainPlayer.uid,
      this.onPlayerAction.bind(this)
    );

    SocketInterface.addListener(this.onSocketMessage.bind(this));
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

  onSocketMessage(message: SocketMessage) {
    if (message.isType(ISocketMessageType.gameDiff)) {
      this.game.handleStateDiff(message.data);
    } else if (message.isType(ISocketMessageType.playerActions)) {
      if (message.data.data.playerUid === this.mainPlayer.uid) return;

      const playerAction = new PlayerAction(
        message.data.type,
        message.data.data
      );

      this.playerActionService.performAction(
        message.data.data.playerUid,
        playerAction
      );
    }
  }
}
