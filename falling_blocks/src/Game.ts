import * as WebSocket from "ws";

interface Player {
  uid: string;
  pos: number[];
  ws: WebSocket;
}

export class Game {
  players: Map<WebSocket, Player> = new Map();

  constructor() {}

  newPlayer(ws: WebSocket) {
    const uid = `${Math.random()}${Math.random()}`;
    const newPlayer: Player = {
      uid,
      ws,
      pos: [0, 0, 0]
    };
    this.players.set(ws, newPlayer);
    return uid;
  }

  removePlayer(ws: WebSocket) {
    this.players.delete(ws);
  }

  getPlayerUid(ws: WebSocket) {
    return this.players.get(ws).uid;
  }

  setPlayerPos(ws: WebSocket, pos: number[]) {
    const player = this.players.get(ws);
    player.pos = pos;
  }

  get allPlayers() {
    return Array.from(this.players.values());
  }
}
