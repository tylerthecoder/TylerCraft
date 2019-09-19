import {
  ISocketMessage,
  WelcomeMessage,
  NewEntityMessage
} from "../types/socket";
import { ClientGame } from "./game";
import { Ball } from "../src/entities/ball";
import { PlayerSocketController } from "./controllers/playerSocketController";
import { Entity } from "../src/entities/entity";

type SocketListener = (message: ISocketMessage) => void;

export class SocketHandler {
  socket: WebSocket;

  listeners: SocketListener[] = [];

  receivedEntities: Set<string> = new Set();

  constructor(public client: ClientGame) {}

  connect() {
    return new Promise(resolve => {
      this.socket = new WebSocket("ws://localhost:3000");
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
        case "new-entity":
          this.newEntity(obj.payload as NewEntityMessage);
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
    const newPlayer = this.client.game.addPlayer(false, uid);
    const controller = new PlayerSocketController(newPlayer);
    this.client.addController(controller);
  }

  newEntity(payload: NewEntityMessage) {
    this.receivedEntities.add(payload.uid);
    if (payload.type === "ball") {
      const entity = new Ball(payload.pos, payload.vel);
      entity.setUid(payload.uid);
      this.client.game.addEntity(entity);
    }
  }

  sendEntity(entity: Entity) {
    // we were given him, don't play telephone
    if (this.receivedEntities.has(entity.uid)) return;

    let type = "";
    if (entity instanceof Ball) {
      type = "ball";
    }

    if (type) {
      const payload: NewEntityMessage = {
        uid: entity.uid,
        pos: entity.pos,
        vel: entity.vel,
        type
      };
      const message = {
        type: "new-entity",
        payload
      };
      this.send(message);
    }
  }
}
