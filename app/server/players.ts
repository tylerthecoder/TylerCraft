import SocketServer from "./socket";
import * as wSocket from "ws";
import { Game } from "../src/game";
import { Player } from "../src/entities/player";
import { ISocketMessage, PositionMessage } from "../types/socket";

export default class Players {
  players: Map<wSocket, Player> = new Map();

  constructor(public wss: SocketServer, public game: Game) {
    this.wss.listen(this.newPlayer.bind(this));
  }

  newPlayer(ws: wSocket) {
    console.log("New player!");
    // generate a random ID for the new player
    const uid = `${Math.random()}${Math.random()}`;

    const player = this.game.addPlayer(uid);

    // send a welcoming message to the new player
    const welcomeMessage = {
      type: "welcome",
      payload: {
        uid,
        players: this.game.players.map(p => p.uid).filter(id => uid !== id)
      }
    };
    this.wss.send(ws, welcomeMessage);

    // add them to the SYSTEM
    this.players.set(ws, player);
    this.wss.listenTo(ws, this.onMessage.bind(this));

    // tell EVERYone about the new guy
    const newPlayerMessage = {
      type: "player-join",
      payload: {
        uid
      }
    };
    this.wss.sendGlobal(newPlayerMessage, ws);

    // If they leave, KILL THEM
    ws.on("close", this.removePlayer.bind(this, ws));

    console.log(`${this.game.players.length} players`);
  }

  removePlayer(ws: wSocket) {
    console.log("Remove Player");

    // tell everyone about this tragedy
    const playerLeaveMessage = {
      type: "player-leave",
      payload: {
        uid: this.players.get(ws).uid
      }
    };
    this.wss.sendGlobal(playerLeaveMessage, ws);

    // FINISH THEM!
    this.game.removeEntity(this.players.get(ws));
    this.players.delete(ws);

    console.log(`${this.game.players.length} players`);
  }

  onMessage(ws: wSocket, message: ISocketMessage) {
    switch (message.type) {
      case "keys":
        this.wss.sendGlobal(message, ws);
        break;
      case "pos":
        this.wss.sendGlobal(message, ws);
        const payload = message.payload as PositionMessage;
        this.players.get(ws).pos = payload.pos;
    }
  }
}
