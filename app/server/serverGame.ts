import Players from "./players";
import * as wSocket from "ws";
import { Game } from "../src/game";
import { IAction, ISocketMessage, ISocketMessageType, IWorldData, WorldModel } from "../src/types";
import { Vector, Vector2D, Vector3D } from "../src/utils/vector";
import SocketServer from "./socket";

export class ServerGame extends Game {
  clients: Players;

  actionQueue: Array<{
    from: wSocket,
    action: IAction
  }> = [];

  constructor(
    private SocketInterface: SocketServer,
    worldModel: WorldModel,
    worldData: IWorldData
  ) {
    super(worldModel, worldData);

    this.clients = new Players(this, SocketInterface);
    this.loop();
  }

  loop(): void {
    if (this.actionQueue.length > 100) {
      console.log(this.actionQueue);
      throw new Error("BAD")
    }

    const sortedActions: Map<wSocket, IAction[]> = new Map();
    this.actionQueue.forEach(({ action, from }) => {
      if (sortedActions.has(from)) {
        sortedActions.get(from)!.push(action);
      } else {
        sortedActions.set(from, [action]);
      }
    });

    // make sure we don't send actions back to the player who sent them
    for (const [ws, actions] of sortedActions) {
      this.clients.sendMessageToAll({
        type: ISocketMessageType.actions,
        actionPayload: actions,
      }, ws);
    }

    // handle the actions
    this.actionQueue.forEach(({ action }) => {
      this.handleAction(action);
    });

    this.actionQueue = [];

    setTimeout(this.loop.bind(this), 1000 / 60);
  }

  private sendChunkTo(chunkPosString: string, ws: wSocket) {
    const chunkPos = Vector2D.fromIndex(chunkPosString);
    const chunk = this.world.getChunkFromPos(chunkPos, { generateIfNotFound: true });
    if (!chunk) throw new Error("Chunk wasn't found");
    const serializedData = chunk.serialize();
    this.SocketInterface.send(ws, {
      type: ISocketMessageType.setChunk,
      setChunkPayload: {
        pos: chunkPosString,
        data: serializedData,
      }
    });
  }

  addSocket(uid: string, ws: wSocket): void {
    this.clients.addPlayer(uid, ws);

    this.SocketInterface.listenTo(ws, (message: ISocketMessage) => {
      console.log("Got Message", message);
      switch (message.type) {
        case ISocketMessageType.actions: {
          const payload = message.actionPayload!;
          this.actionQueue.push(...payload.map(
            a => ({
              action: a,
              from: ws
            })
          ));
          break;
        }
        case ISocketMessageType.getChunk: {
          const payload = message.getChunkPayload!;
          this.sendChunkTo(payload.pos, ws);
          break;
        }
      }
    });
  }
}
