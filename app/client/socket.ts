import { deserializeEntity } from "../src/serializer";
import {
  ISocketMessage,
  ISocketMessageType,
  ISocketWelcomePayload
} from "../types/socket";
import { ClientGame } from "./clientGame";

export type SocketListener = (message: ISocketMessage) => void;

export class SocketHandler {
  private socket: WebSocket;
  private socketUrl = `ws://${location.hostname}:3000`;
  private listeners: SocketListener[] = [];

  constructor(public client: ClientGame) {}

  connect() {
    return new Promise(resolve => {
      this.socket = new WebSocket(this.socketUrl);
      this.socket.onopen = () => {
        console.log("Socket Connected");
        resolve();
        this.startListening();
      };
    });
  }

  addListener(listener: SocketListener) {
    this.listeners.push(listener);
  }

  removeListener(listener: SocketListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  send(obj: ISocketMessage) {
    this.socket.send(JSON.stringify(obj));
  }

  startListening() {
    this.socket.onmessage = e => {
      const data = e.data;
      const obj = JSON.parse(data) as ISocketMessage;
      // console.log("Message from server", obj);
      this.listeners.forEach(l => l(obj));
      switch (obj.type) {
        case ISocketMessageType.welcome:
          this.welcome(obj.welcomePayload!);
          break;
        case ISocketMessageType.newPlayer:
          this.addOtherPlayer(obj.newPlayerPayload!.uid);
          break;
        case ISocketMessageType.playerLeave:
          this.client.removeEntity(obj.playerLeavePayload!.uid);
          break;
        case ISocketMessageType.actions:
          obj.actionPayload!.forEach(a => a.isFromServer = true)
          this.client.addActions(obj.actionPayload!);
          break;
        // case ISocketMessageType.sendChunk: {
        //   const payload = obj.sendChunkPayload!;
        //   const chunkData = payload.data as ISerializedChunk;
        //   const chunk = Chunk.deserialize(chunkData);
        //   const chunkPosVector = Vector.fromString(payload.pos) as Vector2D;
        //   this.client.world.setChunkAtPos(chunk, chunkPosVector)
        // }
      }
    };
  }

  welcome(message: ISocketWelcomePayload) {
    this.client.mainPlayer.setUid(message.uid);
    const entities = message.entities.map(deserializeEntity);
    entities.forEach(ent => this.client.addEntity(ent, false));
  }

  addOtherPlayer(uid: string) {
    this.client.addPlayer(false, uid);
  }
}
