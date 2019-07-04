import SocketServer from "./socket";
import Players from "./players";
import { Game } from "../src/game";

export class ServerGame {
  players: Players;
  game = new Game();

  constructor(public wss: SocketServer) {
    this.players = new Players(wss, this.game);
  }
}
