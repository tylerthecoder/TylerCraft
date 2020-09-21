import SocketServer from "./socket";
import Players from "./players";
import * as wSocket from "ws";
import { Game } from "../src/game";
import { ISocketMessage, ISocketMessageType } from "../types/socket";
import { IAction } from "../types";
import { Vector, Vector2D } from "../src/utils/vector";

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
        type: ISocketMessageType.actions,
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

  private sendChunkTo(chunkPosString: string, ws: wSocket) {
    const chunkPos = Vector.fromString(chunkPosString) as Vector2D;
    const chunk = this.world.getChunkFromPos(chunkPos, {generateIfNotFound: true});
    const serializedData = JSON.stringify(chunk.serialize());
    this.wss.send(ws, {
      type: ISocketMessageType.sendChunk,
      sendChunkPayload: {
        pos: chunkPosString,
        data: serializedData,
      }
    });
  }

  handleMessage(ws: wSocket) {
    this.clients.addPlayer(ws);

    this.wss.listenTo(ws, (ws: wSocket, message: ISocketMessage) => {
      // console.log("Got Message", message);
      switch (message.type) {
      case ISocketMessageType.actions: {
        const payload = message.actionPayload;
        this.actionQueue.push(...payload.map(
          a => ({
            action: a,
            from: ws
          })
        ));
        break;
      }
      case ISocketMessageType.getChunk:
        const payload = message.getChunkPayload;
        this.sendChunkTo(payload.pos, ws);
      }
    });
  }
}
