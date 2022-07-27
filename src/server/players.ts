import { CONFIG, Game, GameStateDiff, ISocketMessage, ISocketMessageType, Player } from "@craft/engine";
import WebSocket from "ws";
import { SocketInterface } from "./app.js";

export default class Players {
  players: Map<WebSocket, Player> = new Map();

  constructor(
    public game: Game,
  ) { }

  getSockets(): WebSocket[] {
    return Array.from(this.players.keys());
  }

  sendMessageToAll(message: ISocketMessage, exclude?: WebSocket) {
    console.log("Sending message to all", message);
    for (const socket of this.players.keys()) {
      if (exclude && socket === exclude) continue;
      SocketInterface.send(socket, message);
    }
  }

  addPlayer(uid: string, ws: WebSocket): void {
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

  removePlayer(ws: WebSocket): void {
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
