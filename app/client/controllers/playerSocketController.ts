import { Controller } from "./controller";
import { Player } from "../../src/entities/player";
import {
  ISocketMessage,
  KeyPressMessage,
  PositionMessage
} from "../../types/socket";
import { game } from "../clientGame";
import { Vector } from "../../src/utils/vector";

export class PlayerSocketController extends Controller {
  constructor(public controlled: Player) {
    super();
    game.socket.addListener(this.onMessage.bind(this));
  }

  onMessage(message: ISocketMessage) {
    if (message.type === "keys") {
      const payload = message.payload as KeyPressMessage;
      if (payload.uid === this.controlled.uid) {
        this.keys = new Set(payload.keys);
        this.controlled.rot = payload.rot;
      }
    } else if (message.type === "pos") {
      const payload = message.payload as PositionMessage;
      if (payload.uid === this.controlled.uid) {
        this.controlled.pos = new Vector(payload.pos);
      }
    }
  }

  update(delta: number) {
    this.wasdKeys(delta);
  }

  keysChange() {}
}
