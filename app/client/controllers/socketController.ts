import { Controller } from "./controller";
import { Player } from "../entities/player";
import {
  SocketHandler,
  ISocketMessage,
  KeyPressMessage,
  PositionMessage
} from "../socket";
import { IDim } from "..";

export class SocketController extends Controller {
  socket: SocketHandler;

  constructor(public entity: Player) {
    super();
    this.socket = new SocketHandler(this.onMessage.bind(this));
  }

  onMessage(message: ISocketMessage) {
    if (message.type === "keys") {
      const payload = message.payload as KeyPressMessage;
      if (payload.uid === this.entity.uid) {
        console.log(message);
        this.keys = new Set(payload.keys);
        this.entity.rot = payload.rot;
      }
    } else if (message.type === "pos") {
      const payload = message.payload as PositionMessage;
      if (payload.uid === this.entity.uid) {
        this.entity.pos = payload.pos.slice(0) as IDim;
      }
    }
  }

  update(delta: number) {
    this.wasdKeys(delta);
  }

  keysChange() {}
}
