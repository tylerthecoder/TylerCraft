import {
  CONFIG,
  IGameMetadata,
  Game,
  Chunk,
  ICreateWorldOptions,
  ISocketMessageType,
  ISocketWelcomePayload,
  IWorldData,
  WorldModel,
  IChunkReader,
  WorldModule,
  SocketMessage,
} from "@craft/engine";
import { getMyUid, SocketInterface } from "../app";
import { SocketListener } from "../socket";
import { ApiService } from "../services/api-service";

export class NetworkWorldModel extends WorldModel {
  private async waitForWelcomeMessage() {
    let listener: SocketListener | null = null;
    const welcomeMessage: ISocketWelcomePayload = await new Promise(
      (resolve) => {
        listener = (message) => {
          if (message.isType(ISocketMessageType.welcome)) {
            resolve(message.data);
          }
        };
        SocketInterface.addListener(listener);
      }
    );
    SocketInterface.removeListener(listener!);
    return welcomeMessage;
  }

  private makeGameReader(welcomeMessage: ISocketWelcomePayload): IWorldData {
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
          // tg: {
          //   blocksToRender: [],
          // }
        },
      },
      chunkReader: new ServerGameReader(),
      activePlayers: welcomeMessage.activePlayers,
      worldId: welcomeMessage.worldId,
      config: welcomeMessage.config,
      name: welcomeMessage.name,
      multiplayer: true,
    };
  }

  public async createWorld(
    createWorldOptions: ICreateWorldOptions
  ): Promise<IWorldData> {
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.newWorld, {
        myUid: getMyUid(),
        ...createWorldOptions,
      })
    );

    console.log("Creating world");

    const welcomeMessage = await this.waitForWelcomeMessage();

    console.log("Welcome Message", welcomeMessage);

    return {
      worldId: welcomeMessage.worldId,
      chunkReader: new ServerGameReader(),
      name: createWorldOptions.gameName,
      config: createWorldOptions.config,
      multiplayer: true,
    };
  }

  public async getWorld(worldId: string): Promise<IWorldData | null> {
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.joinWorld, {
        worldId,
        myUid: getMyUid(),
      })
    );

    const welcomeMessage = await this.waitForWelcomeMessage();
    return this.makeGameReader(welcomeMessage);
  }

  public async getAllWorlds(): Promise<IGameMetadata[]> {
    return await ApiService.getWorlds();
  }

  // we might not have to send the data to the server here. Just tell the server that we want to save and it will
  // use its local copy of the game to save
  public async saveWorld(gameData: Game): Promise<void> {
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.saveWorld, {
        worldId: gameData.gameId,
      })
    );
  }

  public async deleteWorld(_worldId: string) {
    // TO-DO implement this (REST)
  }
}

class ServerGameReader implements IChunkReader {
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
