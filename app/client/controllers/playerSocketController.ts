import { Controller } from "./controller";
import { Player } from "../../src/entities/player";
import {
  SocketHandler,
  ISocketMessage,
  KeyPressMessage,
  PositionMessage
} from "../socket";
import { IDim } from "../../src";

export class PlayerSocketController extends Controller {
  socket: SocketHandler;

  constructor(public controlled: Player) {
    super();
    this.socket = new SocketHandler(this.onMessage.bind(this));
  }

  onMessage(message: ISocketMessage) {
    if (message.type === "keys") {
      const payload = message.payload as KeyPressMessage;
      if (payload.uid === this.controlled.uid) {
        console.log(message);
        this.keys = new Set(payload.keys);
        this.controlled.rot = payload.rot;
      }
    } else if (message.type === "pos") {
      const payload = message.payload as PositionMessage;
      if (payload.uid === this.controlled.uid) {
        this.controlled.pos = payload.pos.slice(0) as IDim;
      }
    }
  }

  update(delta: number) {
    this.wasdKeys(delta);
  }

  keysChange() {}
}
