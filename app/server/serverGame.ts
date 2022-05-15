import Players from "./players";
import * as wSocket from "ws";
import { ISocketMessage, ISocketMessageType } from "../src/types";
import { Vector2D } from "../src/utils/vector";
import { AbstractScript } from "../src/scripts/AbstractScript";
import { GameAction } from "../src/gameActions";
import { Game } from "../src/game";
import { GameStateDiff } from "../src/gameStateDiff";
import { MapArray } from "../src/utils";
import { SocketInterface } from "./app";

export class ServerGame extends AbstractScript {
  public clients: Players;
  public actionMap: MapArray<wSocket, GameAction> = new MapArray();


  constructor(
    public game: Game,
  ) {
    super(game);

    this.clients = new Players(this.game);
  }

  async init(): Promise<void> {
    // NO-OP
  }

  onAction(_action: GameAction): void {
    // throw new Error("Method not implemented.");
  }

  update(_delta: number): void {
    // Send the initial state diff to all clients
    // This state diff has no client sent actions so it should
    // only be passive things (An entity spawning)
    this.clients.sendMessageToAll({
      type: ISocketMessageType.gameDiff,
      gameDiffPayload: this.game.stateDiff.get(),
    });

    this.game.stateDiff.clear();

    // Run through each client's actions and save the combined state diff
    // from the other client's actions. Combining them lets us send all client
    // updates as one socket message.

    // Set the initial state diff for each client
    const clientDiffs = new Map<wSocket, GameStateDiff>();
    for (const ws of this.actionMap.keys()) {
      clientDiffs.set(ws, this.game.stateDiff.copy());
    }

    for (const [ws, actions] of this.actionMap.entries()) {
      this.game.stateDiff.clear();

      // Handle all the actions. The new diff should only have updates
      // for the player who made them and chunk they might have affected
      for (const action of actions) {
        this.game.handleAction(action);
      }

      // Append the diff to all clients but the one that sent the actions
      this.clients
        .getSockets()
        .filter(s => s !== ws)
        .forEach(s => {
          clientDiffs.get(s)?.append(this.game.stateDiff);
        });
    }


    // Send the combined state diff to all clients
    for (const [ws, diff] of clientDiffs.entries()) {
      SocketInterface.send(ws, {
        type: ISocketMessageType.gameDiff,
        gameDiffPayload: diff.get(),
      });
    }

  }

  private async sendChunkTo(chunkPosString: string, ws: wSocket) {
    const chunkPos = Vector2D.fromIndex(chunkPosString);
    let chunk = this.game.world.getChunkFromPos(chunkPos);
    if (!chunk) {
      await this.game.world.loadChunk(chunkPos);
      chunk = this.game.world.getChunkFromPos(chunkPos);
    }
    if (!chunk) throw new Error("Chunk wasn't found");
    const serializedData = chunk.serialize();
    SocketInterface.send(ws, {
      type: ISocketMessageType.setChunk,
      setChunkPayload: {
        pos: chunkPosString,
        data: serializedData,
      }
    });
  }

  addSocket(uid: string, ws: wSocket): void {
    this.clients.addPlayer(uid, ws);

    SocketInterface.listenTo(ws, (message: ISocketMessage) => {
      console.log("Got Message", message);
      switch (message.type) {
        case ISocketMessageType.actions: {
          const payload = message.actionPayload!;
          this.actionMap.append(ws, payload);
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
