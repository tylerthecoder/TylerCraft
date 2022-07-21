import * as wSocket from "ws";
import { CONFIG } from "@craft/engine/config";
import { Player } from "@craft/engine/entities/player";
import { Game } from "@craft/engine/game";
import { GameStateDiff } from "@craft/engine/gameStateDiff";
import { ISocketMessage, ISocketMessageType } from "@craft/engine/types";
import { SocketInterface } from "./app";

export default class Players {
  players: Map<wSocket, Player> = new Map();

  constructor(
    public game: Game,
  ) { }

  getSockets(): wSocket[] {
    return Array.from(this.players.keys());
  }

  sendMessageToAll(message: ISocketMessage, exclude?: wSocket) {
    console.log("Sending message to all", message);
    for (const socket of this.players.keys()) {
      if (exclude && socket === exclude) continue;
      SocketInterface.send(socket, message);
    }
  }

  addPlayer(uid: string, ws: wSocket): void {
    // generate a random ID for the new player

    const player = this.game.addPlayer(uid);

    // send a welcoming message to the new player
    const welcomeMessage: ISocketMessage = {
      type: ISocketMessageType.welcome,
      welcomePayload: {
        uid,
        worldId: this.game.gameId,
        entities: this.game.entities.serialize(),
        activePlayers: Array.from(this.players.values()).map(p => p.uid),
        config: CONFIG,
        name: this.game.name,
      }
    };
    SocketInterface.send(ws, welcomeMessage);

    // add them to the SYSTEM
    this.players.set(ws, player);

    const gameDiff = new GameStateDiff(this.game);
    gameDiff.addEntity(uid);

    // tell Everyone about the new guy
    const newPlayerMessage: ISocketMessage = {
      type: ISocketMessageType.gameDiff,
      gameDiffPayload: gameDiff.get(),
    };
    this.sendMessageToAll(newPlayerMessage, ws);

    // If they leave, KILL THEM
    ws.on("close", this.removePlayer.bind(this, ws));

    console.log(`New player! ${uid} ${this.game.entities.getActivePlayers().length} players`);
  }

  removePlayer(ws: wSocket): void {
    const player = this.players.get(ws);

    if (!player) {
      return;
    }

    const gameDiff = new GameStateDiff(this.game);
    gameDiff.removeEntity(player.uid);

    // tell everyone about this tragedy
    const newPlayerMessage: ISocketMessage = {
      type: ISocketMessageType.gameDiff,
      gameDiffPayload: gameDiff.get(),
    };
    this.sendMessageToAll(newPlayerMessage, ws);

    // FINISH THEM!
    this.game.entities.remove(player.uid);
    this.players.delete(ws);

    console.log(`Remove Player! ${this.game.entities.getActivePlayers().length} players`);
  }
}
