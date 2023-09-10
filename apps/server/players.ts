import {
  CONFIG,
  Game,
  GameStateDiff,
  ISocketMessageType,
  Player,
  PlayerAction,
  SocketMessage,
  handlePlayerAction,
} from "@craft/engine";
import WebSocket from "ws";
import { SocketInterface } from "./server";

export default class Players {
  players: Map<WebSocket, Player> = new Map();

  constructor(public game: Game) {}

  getSockets(): WebSocket[] {
    return Array.from(this.players.keys());
  }

  sendMessageToAll(message: SocketMessage, exclude?: WebSocket) {
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
    const welcomeMessage = new SocketMessage(ISocketMessageType.welcome, {
      uid,
      worldId: this.game.gameId,
      entities: this.game.entities.serialize(),
      activePlayers: Array.from(this.players.values()).map((p) => p.uid),
      config: CONFIG,
      name: this.game.name,
    });
    SocketInterface.send(ws, welcomeMessage);

    // add them to the SYSTEM
    this.players.set(ws, player);

    // listen for changes from the player
    const listener = (message: SocketMessage) => {
      if (message.isType(ISocketMessageType.playerActions)) {
        const playerAction = new PlayerAction(
          message.data.type,
          message.data.data
        );
        this.onPlayerAction(ws, playerAction);
      }
    };
    SocketInterface.listenTo(ws, listener);

    const gameDiff = new GameStateDiff(this.game);
    gameDiff.addEntity(uid);

    // tell Everyone about the new guy
    this.sendMessageToAll(
      new SocketMessage(ISocketMessageType.gameDiff, gameDiff.get()),
      ws
    );

    // If they leave, KILL THEM
    ws.on("close", this.removePlayer.bind(this, ws));

    console.log(
      `New player! ${uid} ${
        this.game.entities.getActivePlayers().length
      } players`
    );
  }

  removePlayer(ws: WebSocket): void {
    const player = this.players.get(ws);

    if (!player) {
      return;
    }

    const gameDiff = new GameStateDiff(this.game);
    gameDiff.removeEntity(player.uid);

    // tell everyone about this tragedy
    this.sendMessageToAll(
      new SocketMessage(ISocketMessageType.gameDiff, gameDiff.get()),
      ws
    );

    console.log(
      "Player left",
      player.uid,
      this.game.entities.getActivePlayers().length
    );

    // FINISH THEM!
    this.game.entities.removePlayer(player.uid);
    this.players.delete(ws);

    console.log(
      `Remove Player! ${this.game.entities.getActivePlayers().length} players`
    );
  }

  onPlayerAction(ws: WebSocket, playerAction: PlayerAction) {
    const player = this.players.get(ws);
    if (!player) {
      return;
    }
    handlePlayerAction(this.game, player, playerAction);

    // tell everyone about the new action
    this.sendMessageToAll(
      new SocketMessage(
        ISocketMessageType.playerActions,
        playerAction.getDto()
      ),
      ws
    );
  }
}
