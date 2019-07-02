import SocketServer from "./socket";
import * as wSocket from "ws";

interface Player {
  uid: string;
  pos: number[];
  ws: wSocket;
}

export default class Players {
  players: Map<wSocket, Player> = new Map();

  get playersArray() {
    return Array.from(this.players.values());
  }

  constructor(public wss: SocketServer) {
    this.wss.listen(this.newPlayer.bind(this));
  }

  newPlayer(ws: wSocket) {
    console.log("New Player!");
    // generate a random ID for the new player
    const uid = `${Math.random()}${Math.random()}`;

    // send a welcoming message to the new player
    const welcomeMessage = {
      type: "welcome",
      payload: {
        uid,
        players: this.playersArray.map(p => p.uid)
      }
    };
    this.wss.send(ws, welcomeMessage);

    // add them to the SYSTEM
    const newPlayer: Player = {
      uid,
      ws,
      pos: [0, 0, 0]
    };
    this.players.set(ws, newPlayer);
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
  }

  removePlayer(ws: wSocket) {
    // tell everyone about this tragedy
    const playerLeaveMessage = {
      type: "player-leave",
      payload: {
        uid: this.players.get(ws).uid
      }
    };
    this.wss.sendGlobal(playerLeaveMessage, ws);

    // FINISH THEM!
    this.players.delete(ws);
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
