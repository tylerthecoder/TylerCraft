import SocketServer from "./socket";
import * as wSocket from "ws";
import { Game } from "../src/game";
import { Player } from "../src/entities/player";
import { ISocketMessage, ISocketMessageType } from "../types/socket";

export default class Players {
  players: Map<wSocket, Player> = new Map();

  constructor(public wss: SocketServer, public game: Game) {}

  addPlayer(ws: wSocket): void {
    // generate a random ID for the new player
    const uid = `${Math.random()}${Math.random()}`;

    const player = this.game.addPlayer(true, uid);

    // send a welcoming message to the new player
    const welcomeMessage: ISocketMessage = {
      type: ISocketMessageType.welcome,
      welcomePayload: {
        uid,
        players: this.game.players.map(p => p.uid).filter(id => uid !== id)
      }
    };
    this.wss.send(ws, welcomeMessage);

    // add them to the SYSTEM
    this.players.set(ws, player);

    // tell Everyone about the new guy
    const newPlayerMessage: ISocketMessage = {
      type: ISocketMessageType.newPlayer,
      newPlayerPayload: {
        uid
      }
    };
    this.wss.sendGlobal(newPlayerMessage, ws);

    // If they leave, KILL THEM
    ws.on("close", this.removePlayer.bind(this, ws));

    console.log(`New player! ${this.game.players.length} players`);
  }

  removePlayer(ws: wSocket): void {
    const player = this.players.get(ws);

    if (!player) {
      return;
    }

    // tell everyone about this tragedy
    const playerLeaveMessage: ISocketMessage = {
      type: ISocketMessageType.playerLeave,
      playerLeavePayload: {
        uid: player.uid
      }
    };
    this.wss.sendGlobal(playerLeaveMessage, ws);

    // FINISH THEM!
    this.game.removeEntity(player.uid);
    this.players.delete(ws);

    console.log(`Remove Player! ${this.game.players.length} players`);
  }

}
