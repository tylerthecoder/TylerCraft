import Players from "./players";
import * as wSocket from "ws";
import { ISocketMessage, ISocketMessageType, IWorldData, WorldModel } from "../src/types";
import { Vector2D } from "../src/utils/vector";
import { GameActionDto, GameActionHolder } from "../src/gameActions";
import { Game } from "../src/game";
import { GameStateDiff } from "../src/gameStateDiff";
import { MapArray } from "../src/utils";
import { SocketInterface } from "./app";
import { GameController } from "@tylercraft/src/controllers/controller";

export class ServerGame extends Game {
  public clients: Players;
  public actionMap: MapArray<wSocket, GameActionDto> = new MapArray();


  constructor(
    controller: (game: Game) => GameController,
    worldModel: WorldModel,
    worldData: IWorldData,
  ) {
    super(controller, worldModel, worldData);

    this.clients = new Players(this);
  }

  async load(): Promise<void> {
    // NO-OP
  }

  onAction(_action: GameActionHolder): void {
    // NO-OP
  }

  update(_delta: number): void {
    // Send the initial state diff to all clients
    // This state diff has no client sent actions so it should
    // only be passive things (An entity spawning)
    if (this.stateDiff.hasData()) {
      this.clients.sendMessageToAll({
        type: ISocketMessageType.gameDiff,
        gameDiffPayload: this.stateDiff.get(),
      });
    }

    this.stateDiff.clear();

    // Run through each client's actions and save the combined state diff
    // from the other client's actions. Combining them lets us send all client
    // updates as one socket message.

    // Set the initial state diff for each client
    const clientDiffs = new Map<wSocket, GameStateDiff>();
    for (const ws of this.clients.getSockets()) {
      clientDiffs.set(ws, this.stateDiff.copy());
    }

    if (this.actionMap.size > 0) {
      for (const [ws, actions] of this.actionMap.entries()) {
        console.log("Actions", actions)
      }
    }

    for (const [ws, actions] of this.actionMap.entries()) {
      this.stateDiff.clear();

      // Handle all the actions. The new diff should only have updates
      // for the player who made them and chunk they might have affected
      for (const action of actions) {
        this.handleAction(action.action, action.data);
      }

      console.log("Diff after actions", this.stateDiff.get());

      // Append the diff to all clients but the one that sent the actions
      this.clients
        .getSockets()
        .filter(s => s !== ws)
        .forEach(s => {
          clientDiffs.get(s)?.append(this.stateDiff);
        });

    }

    // Send the combined state diff to all clients
    for (const [ws, diff] of clientDiffs.entries()) {
      if (diff.hasData()) {
        const diffData = diff.get();
        console.log("Sending diff", diffData)
        SocketInterface.send(ws, {
          type: ISocketMessageType.gameDiff,
          gameDiffPayload: diffData,
        });
      }
    }

    this.actionMap.clear();
  }

  private async sendChunkTo(chunkPosString: string, ws: wSocket) {
    const chunkPos = Vector2D.fromIndex(chunkPosString);
    let chunk = this.world.getChunkFromPos(chunkPos);
    if (!chunk) {
      await this.world.loadChunk(chunkPos);
      chunk = this.world.getChunkFromPos(chunkPos);
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
