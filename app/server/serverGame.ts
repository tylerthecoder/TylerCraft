import SocketServer from "./socket";
import Players from "./players";
import * as wSocket from "ws";
import { Game } from "../src/game";
import { ISocketMessage, NewEntityMessage } from "../types/socket";
import { Ball } from "../src/entities/ball";
import { Entity } from "../src/entities/entity";

export class ServerGame {
  players: Players;
  game = new Game();

  constructor(public wss: SocketServer) {
    this.players = new Players(wss, this.game);

    this.wss.listen(this.handleMessage.bind(this));
  }

  loop() {
    // send a socket message if people/entities have moved

    setTimeout(this.loop, 1000 / 60);
  }

  handleMessage(ws: wSocket) {
    this.players.addPlayer(ws);

    this.wss.listenTo(ws, (ws: wSocket, message: ISocketMessage) => {
      switch (message.type) {
        case "keys":
          this.wss.sendGlobal(message, ws);
          break;
        case "pos":
          this.wss.sendGlobal(message, ws);
          break;
        case "new-entity":
          this.wss.sendGlobal(message, ws);
          const payload = message.payload as NewEntityMessage;
          if (payload.type === "ball") {
            const ball = new Ball(payload.pos, payload.vel);
            ball.setUid(payload.uid);
            this.game.addEntity(ball);
          }
          break;
      }
    });
  }

  addEntity(entity: Entity) {
    this.game.addEntity(entity);
  }
}
