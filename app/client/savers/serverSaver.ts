import { ISerializedGame, IGameMetadata } from "../../src/game";
import { Chunk, } from "../../src/world/chunk";
import { IChunkReader,  WorldModel } from "../../src/worldModel";
import { ISocketMessage, ISocketMessageType } from "../../types/socket";
import { SocketHandler, SocketListener } from "../socket";


export class ServerSaver extends WorldModel {
  private serverURL = `${location.href}`;

  constructor(private socket: SocketHandler) {super()}

  public async getWorld(worldId: string) {
    const res = await fetch(`${this.serverURL}world/${worldId}`);
    const data = await res.json() as ISerializedGame;
    return {
      data,
      chunkReader: new ServerGameReader(this.socket)
    };
  }

  public async getAllWorlds(): Promise<IGameMetadata[]> {
    const res = await fetch(`${this.serverURL}worlds`);
    const data = await res.json() as IGameMetadata[];
    return data;
  }

  // we might not have to send the data to the server here. Just tell the server that we want to save and it will
  // use its local copy of the game to save
  public async saveWorld(gameData: ISerializedGame): Promise<void> {
    const res = await fetch(`${this.serverURL}world`, {
      method: "POST",
      body: JSON.stringify(gameData),
    });
    await res.text();
  }

  public async deleteWorld(_worldId: string) {
    // TO-DO implement this (REST)
  }
}

class ServerGameReader implements IChunkReader {

  constructor(
    private socket: SocketHandler
  ) {}

  // send a socket message asking for the chunk then wait for the reply
  // this could also be a rest endpoint but hat isn't as fun :) Plus the socket already has some identity to it
  async getChunk(chunkPos: string) {
    // send the socket message
    this.socket.send({
      type: ISocketMessageType.getChunk,
      getChunkPayload: {
        pos: chunkPos,
      }
    });

    let listener: SocketListener|null = null;
    const chunk: Chunk = await new Promise((resolve) => {
      listener = (message: ISocketMessage) => {
        if (message.type === ISocketMessageType.sendChunk) {
          const payload = message.sendChunkPayload!;
          if (payload.pos !== chunkPos) return;
          const chunk = Chunk.deserialize(payload.data);
          resolve(chunk);
        }
      }
      this.socket.addListener(listener)
    });
    this.socket.removeListener(listener!);
    return chunk;
  }
}