import { ClientGame } from "../clientGame";

/** This class will bypass the client actions and directly change
 *  the state of the game */
export class SocketGameHandler {
  constructor(public controlled: ClientGame) {}

  // maybe perform the actions in here so they aren't async
  update() {
    /* NO-OP */
  }
}
