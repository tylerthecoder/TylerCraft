import {
  CONFIG,
  IGameMetadata,
  Chunk,
  ISocketWelcomePayload,
  IChunkReader,
  WorldModule,
  IGameManager,
  ICreateGameOptions,
  IGameData,
  Game,
  GameAction,
  ISocketMessageType,
  Player,
  PlayerAction,
  SocketMessage,
  handlePlayerAction,
} from "@craft/engine";
import { SocketInterface, getMyUid } from "./app";
import { SocketListener } from "./socket";
import { ApiService } from "./services/api-service";
import { BasicUsecase, TimerRunner } from "./runners";

export class NetworkGameManager implements IGameManager {
  async startGame(game: Game): Promise<void> {
    new TimerRunner(game);
    const basicUsecase = new BasicUsecase(game);
    new MultiplayerGameScript(game, basicUsecase.mainPlayer);
  }

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

  private makeGameReader(welcomeMessage: ISocketWelcomePayload): IGameData {
    return {
      data: {
        // send this over socket soon
        config: CONFIG,
        gameId: welcomeMessage.worldId,
        entities: welcomeMessage.entities,
        name: "Something",
        // just an empty world (the chunk reader should fill it)
        world: {
          chunks: [],
        },
      },
      chunkReader: new ServerChunkReader(),
      activePlayers: welcomeMessage.activePlayers,
      id: welcomeMessage.worldId,
      gameSaver: {
        save: async (game: Game) => {
          this.saveGame(game);
        },
      },
      config: welcomeMessage.config,
      name: welcomeMessage.name,
    };
  }

  public async createGame(options: ICreateGameOptions): Promise<IGameData> {
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

    return this.makeGameReader(welcomeMessage);
  }

  public async getGame(gameId: string): Promise<IGameData | null> {
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

    return this.makeGameReader(welcomeMessage);
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
export class MultiplayerGameScript {
  debug = true;

  constructor(private game: Game, private mainPlayer: Player) {
    game.addGameActionListener(this.onGameAction.bind(this));
    mainPlayer.addActionListener(this.onPlayerAction.bind(this));
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

      const player = this.game.entities.tryGet(message.data.data.playerUid);

      if (!player) {
        console.log("Player not found", message.data.data.playerUid);
        return;
      }

      if (!(player instanceof Player)) {
        console.log("Entity is not a player", player);
        return;
      }

      const playerAction = new PlayerAction(
        message.data.type,
        message.data.data
      );

      handlePlayerAction(this.game, player, playerAction);
    }
  }
}
