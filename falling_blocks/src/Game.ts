import SocketServer from "./socket";
import Players from "./players";

export class Game {
  players: Players;

  constructor(public wss: SocketServer) {
    this.players = new Players(wss);
  }
}
