import { CONFIG } from "../../src/config";
import { IGameMetadata, Game } from "../../src/game";
import { Chunk, } from "../../src/world/chunk";
import { ICreateWorldOptions, ISocketMessage, ISocketMessageType, ISocketWelcomePayload, IWorldData, WorldModel, IChunkReader } from "../../src/types";
import { getMyUid, SocketInterface } from "../app";
import { SocketListener } from "../socket";
import { SERVER_URL } from "../clientConfig";

export class NetworkWorldModel extends WorldModel {
  private async waitForWelcomeMessage() {
    let listener: SocketListener | null = null;
    const welcomeMessage: ISocketWelcomePayload = await new Promise((resolve) => {
      listener = (message: ISocketMessage) => {
        if (message.type === ISocketMessageType.welcome) {
          resolve(message.welcomePayload!);
        }
      }
      SocketInterface.addListener(listener)
    });
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
        }
      },
      chunkReader: new ServerGameReader(),
      activePlayers: welcomeMessage.activePlayers,
      worldId: welcomeMessage.worldId,
      config: welcomeMessage.config,
      name: welcomeMessage.name,
      multiplayer: true,
    }
  }


  public async createWorld(createWorldOptions: ICreateWorldOptions): Promise<IWorldData> {
    SocketInterface.send({
      type: ISocketMessageType.newWorld,
      newWorldPayload: {
        myUid: getMyUid(),
        ...createWorldOptions,
      }
    });

    console.log("Creating world");

    const welcomeMessage = await this.waitForWelcomeMessage();

    console.log("Welcome Message", welcomeMessage);

    return {
      worldId: welcomeMessage.worldId,
      chunkReader: new ServerGameReader(),
      name: createWorldOptions.gameName,
      config: createWorldOptions.config,
      multiplayer: true,
    }
  }

  public async getWorld(worldId: string): Promise<IWorldData | null> {
    SocketInterface.send({
      type: ISocketMessageType.joinWorld,
      joinWorldPayload: {
        worldId,
        myUid: getMyUid(),
      }
    });

    const welcomeMessage = await this.waitForWelcomeMessage();
    return this.makeGameReader(welcomeMessage);
  }

  public async getAllWorlds(): Promise<IGameMetadata[]> {
    const requestUrl = `${SERVER_URL}worlds`;
    const res = await fetch(requestUrl);
    const data = await res.json() as IGameMetadata[];
    return data;
  }

  // we might not have to send the data to the server here. Just tell the server that we want to save and it will
  // use its local copy of the game to save
  public async saveWorld(gameData: Game): Promise<void> {
    SocketInterface.send({
      type: ISocketMessageType.saveWorld,
      saveWorldPayload: {
        worldId: gameData.gameId,
      }
    });
  }

  public async deleteWorld(_worldId: string) {
    // TO-DO implement this (REST)
  }
}

class ServerGameReader implements IChunkReader {

  // send a socket message asking for the chunk then wait for the reply
  // this could also be a rest endpoint but hat isn't as fun :) Plus the socket already has some identity to it
  async getChunk(chunkPos: string) {
    // send the socket message
    SocketInterface.send({
      type: ISocketMessageType.getChunk,
      getChunkPayload: {
        pos: chunkPos,
      },
    });

    let listener: SocketListener | null = null;
    const chunk: Chunk = await new Promise((resolve) => {
      listener = (message: ISocketMessage) => {
        if (message.type === ISocketMessageType.setChunk) {
          const payload = message.setChunkPayload!;
          if (payload.pos !== chunkPos) return;
          const chunk = Chunk.deserialize(payload.data);
          resolve(chunk);
        }
      }
      SocketInterface.addListener(listener)
    });
    SocketInterface.removeListener(listener!);

    // console.log("Getting chunk", chunk);

    return chunk;
  }
}
