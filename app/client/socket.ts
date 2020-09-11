import {
  ISocketMessage,
  WelcomeMessage,
  NewEntityMessage
} from "../types/socket";
import { ClientGame } from "./clientGame";
import { Ball } from "../src/entities/ball";
import { PlayerSocketController } from "./controllers/playerSocketController";
import { Entity } from "../src/entities/entity";
import { Vector3D } from "../src/utils/vector";
import { IDim } from "../types";

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

  joinRoom(roomName: string) {}

  send(obj: Object) {
    this.socket.send(JSON.stringify(obj));
  }

  startListening() {
    this.socket.onmessage = e => {
      const data = e.data;
      const obj = JSON.parse(data) as ISocketMessage;
      // console.log("Message from server", obj);
      this.listeners.forEach(l => l(obj));
      switch (obj.type) {
        case "welcome":
          this.welcome(obj.payload as WelcomeMessage);
          break;
        case "player-join":
          this.addOtherPlayer(obj.payload.uid);
          break;
        case "player-leave":
          this.client.removeEntity(obj.payload.uid);
          break;
        case "actions":
          obj.actionPayload.forEach(a => a.isFromServer = true)
          this.client.addActions(obj.actionPayload);
          break;
      }
    };
  }

  welcome(message: WelcomeMessage) {
    this.client.mainPlayer.setUid(message.uid);
    message.players.forEach(this.addOtherPlayer.bind(this));
    // get generated world here as well
  }

  addOtherPlayer(uid: string) {
    const newPlayer = this.client.addPlayer(false, uid);
    const controller = new PlayerSocketController(newPlayer);
    this.client.controllers.add(controller);
  }
}
