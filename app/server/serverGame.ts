import SocketServer from "./socket";
import Players from "./players";
import * as wSocket from "ws";
import { Game } from "../src/game";
import { ISocketMessage, NewEntityMessage } from "../types/socket";
import { Ball } from "../src/entities/ball";
import { Entity } from "../src/entities/entity";
import { IDim, IAction } from "../types";

export class ServerGame {
  players: Players;
  game = new Game();

  actions: Array<{
    from: wSocket,
    action: IAction
  }> = [];

  constructor(public wss: SocketServer) {
    this.players = new Players(wss, this.game);

    this.wss.listen(this.handleMessage.bind(this));
  }

  loop() {
    // handle the actions
    const changedEntities = new Set<string>();
    this.actions.forEach(action => {
      const uid = this.game.handleAction(action.action);

      // send the message to all client's

      changedEntities.add(uid);
    });

    // send a socket message if people/entities have moved



    // send the entire game state when it changes?

    setTimeout(this.loop, 1000 / 60);
  }

  handleMessage(ws: wSocket) {
    this.players.addPlayer(ws);

    this.wss.listenTo(ws, (ws: wSocket, message: ISocketMessage) => {
      switch (message.type) {
        case "actions":
          this.actions.push(...message.actionPayload.map(
            a => ({
              action: a,
              from: ws
            })
          ));
          break;
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
