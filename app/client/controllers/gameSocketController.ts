import { ISocketMessage, ISocketMessageType } from "../../src/types";
import { SocketInterface } from "../app";
import { ClientGame } from "../clientGame";

/** This class will bypass the client actions and directly change
 *  the state of the game */
export class SocketGameHandler {
  constructor(
    public controlled: ClientGame
  ) {
    SocketInterface.addListener(this.onMessage.bind(this));
  }

  // maybe perform the actions in here so they aren't async
  update() { /* NO-OP */ }

  onMessage(message: ISocketMessage) {
    if (message.type === ISocketMessageType.gameDiff) {
      this.controlled.game.handleStateDiff(message.gameDiffPayload!);
    }
  }
}
