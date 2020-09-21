import { Vector, Vector2D } from "../src/utils/vector";
import { Chunk, ISerializedChunk } from "../src/world/chunk";
import {
  ISocketMessage,
  ISocketMessageType,
  ISocketWelcomePayload
} from "../types/socket";
import { ClientGame } from "./clientGame";

type SocketListener = (message: ISocketMessage) => void;

export class SocketHandler {
  private socket: WebSocket;

  private socketUrl = `ws://${location.hostname}:3000`;

  listeners: SocketListener[] = [];

  receivedEntities: Set<string> = new Set();

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
        case ISocketMessageType.sendChunk: {
          const payload = obj.sendChunkPayload!;
          const chunkData = JSON.parse(payload.data) as ISerializedChunk;
          const chunk = Chunk.deserialize(chunkData);
          const chunkPosVector = Vector.fromString(payload.pos) as Vector2D;
          this.client.world.setChunkAtPos(chunk, chunkPosVector)
        }
      }
    };
  }

  welcome(message: ISocketWelcomePayload) {
    this.client.mainPlayer.setUid(message.uid);
    message.players.forEach(this.addOtherPlayer.bind(this));
    // get generated world here as well
  }

  addOtherPlayer(uid: string) {
    this.client.addPlayer(false, uid);
  }
}
