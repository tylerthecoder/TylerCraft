import * as wSocket from "ws";
import { Player } from "../src/entities/player";
import { ISocketMessage, ISocketMessageType } from "../types/socket";
import { SocketInterface } from "./server";
import { ServerGame } from "./serverGame";

export default class Players {
  players: Map<wSocket, Player> = new Map();

  constructor(public game: ServerGame) {}

  sendMessageToAll(message: ISocketMessage, exclude?:wSocket) {
    for (const socket of this.players.keys()) {
      if (exclude && socket === exclude) continue;
      SocketInterface.send(socket, message);
    }
  }

  addPlayer(uid: string, ws: wSocket): void {
    // generate a random ID for the new player

    const player = this.game.addPlayer(true, uid);

    // send a welcoming message to the new player
    const welcomeMessage: ISocketMessage = {
      type: ISocketMessageType.welcome,
      welcomePayload: {
        uid,
        worldId: this.game.gameId,
        entities: this.game.serializeEntities(),
      }
    };
    SocketInterface.send(ws, welcomeMessage);

    // add them to the SYSTEM
    this.players.set(ws, player);

    // tell Everyone about the new guy
    const newPlayerMessage: ISocketMessage = {
      type: ISocketMessageType.newPlayer,
      newPlayerPayload: {
        uid
      }
    };
    this.sendMessageToAll(newPlayerMessage, ws);

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
    this.sendMessageToAll(playerLeaveMessage, ws);

    // FINISH THEM!
    this.game.removeEntity(player.uid);
    this.players.delete(ws);

    console.log(`Remove Player! ${this.game.players.length} players`);
  }
}
