import SocketServer from "./socket";
import Players from "./players";
import * as wSocket from "ws";
import { Game } from "../src/game";
import { ISocketMessage, NewEntityMessage } from "../types/socket";
import { Ball } from "../src/entities/ball";
import { Entity } from "../src/entities/entity";
import { IDim, IAction } from "../types";
import { Vector } from "../src/utils/vector";

export class ServerGame extends Game {
  clients: Players;

  actionQueue: Array<{
    from: wSocket,
    action: IAction
  }> = [];

  constructor(public wss: SocketServer) {
    super();

    this.clients = new Players(wss, this);

    this.wss.listen(this.handleMessage.bind(this));

    this.loop();
  }

  loop() {
    if (this.actionQueue.length > 100) {
      console.log(this.actionQueue);
      throw new Error("BAD")
    }

    let sortedActions: Map<wSocket,IAction[]> = new Map();
    this.actionQueue.forEach(({action, from}) => {
      if (sortedActions.has(from)) {
        sortedActions.get(from).push(action);
      } else {
        sortedActions.set(from, [action]);
      }
    });

    for (const [ws, actions] of sortedActions) {
      this.wss.sendGlobal({
        type: "actions",
        actionPayload: actions,
      }, ws);
    }

    // handle the actions
    this.actionQueue.forEach(({action}) => {
      this.handleAction(action);
    });

    this.actionQueue = [];

    setTimeout(this.loop.bind(this), 1000 / 60);
  }

  handleMessage(ws: wSocket) {
    this.clients.addPlayer(ws);

    this.wss.listenTo(ws, (ws: wSocket, message: ISocketMessage) => {
      switch (message.type) {
        case "actions":
          this.actionQueue.push(...message.actionPayload.map(
            a => ({
              action: a,
              from: ws
            })
          ));
          break;
        case "playerPos":

        case "keys":
          this.wss.sendGlobal(message, ws);
          break;
        case "pos":
          this.wss.sendGlobal(message, ws);
          break;
      }
    });
  }
}
