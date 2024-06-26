import Players from "./players.js";
import WebSocket from "ws";
import {
  Game,
  GameAction,
  GameStateDiff,
  ISocketMessageType,
  MapArray,
  Vector2D,
  SocketMessage,
  setConfig,
  IConfig,
} from "@craft/engine";
import SocketServer from "./socket.js";

export class ServerGame {
  public clients: Players;
  public actionMap: MapArray<WebSocket, GameAction> = new MapArray();

  constructor(
    private config: IConfig,
    private socketInterface: SocketServer,
    public game: Game
  ) {
    // Remove all players since none are connected yet
    game.entities.removeAllPlayers();

    setConfig(config);

    this.clients = new Players(game, socketInterface);
  }

  onGameAction(_action: GameAction): void {
    // NO-OP
  }

  update(_delta: number): void {
    const stateDiff = this.game.stateDiff;

    // Set the config for the game (This is a hack since the config is global)
    setConfig(this.config);

    // Send the initial state diff to all clients
    // This state diff has no client sent actions so it should
    // only be passive things (An entity spawning)
    if (stateDiff.hasData()) {
      this.clients.sendMessageToAll(
        new SocketMessage(ISocketMessageType.gameDiff, stateDiff.get())
      );
    }

    stateDiff.clear();

    // Run through each client's actions and save the combined state diff
    // from the other client's actions. Combining them lets us send all client
    // updates as one socket message.

    // Set the initial state diff for each client
    const clientDiffs = new Map<WebSocket, GameStateDiff>();
    for (const ws of this.clients.getSockets()) {
      clientDiffs.set(ws, stateDiff.copy());
    }

    if (this.actionMap.size > 0) {
      for (const actions of this.actionMap.values()) {
        console.log("Actions", actions);
      }
    }

    for (const [ws, actions] of this.actionMap.entries()) {
      stateDiff.clear();

      // Handle all the actions. The new diff should only have updates
      // for the player who made them and chunk they might have affected
      for (const action of actions) {
        this.game.handleAction(action);
      }

      console.log("Diff after actions", stateDiff.get());

      // Append the diff to all clients but the one that sent the actions
      this.clients
        .getSockets()
        .filter((s) => s !== ws)
        .forEach((s) => {
          clientDiffs.get(s)?.append(stateDiff);
        });
    }

    // Send the combined state diff to all clients
    for (const [ws, diff] of clientDiffs.entries()) {
      if (diff.hasData()) {
        const diffData = diff.get();
        console.log("Sending diff", diffData);
        this.socketInterface.send(
          ws,
          new SocketMessage(ISocketMessageType.gameDiff, diffData)
        );
      }
    }

    this.actionMap.clear();
  }

  private async sendChunkTo(chunkPosString: string, ws: WebSocket) {
    // Set the config for the game (This is a hack since the config is global)
    setConfig(this.config);
    const world = this.game.world;
    console.log("ServerGame: Sending chunk to player: ", chunkPosString);
    const chunkPos = Vector2D.fromIndex(chunkPosString);
    let chunk = world.getChunkFromPos(chunkPos);
    if (!chunk) {
      await world.chunks.immediateLoadChunk(chunkPos);
      chunk = world.getChunkFromPos(chunkPos);
    }
    if (!chunk) throw new Error("Chunk wasn't found");
    const serializedData = chunk.serialize();
    this.socketInterface.send(
      ws,
      new SocketMessage(ISocketMessageType.setChunk, {
        pos: chunkPosString,
        data: serializedData,
      })
    );
  }

  addSocket(uid: string, ws: WebSocket): void {
    this.clients.addPlayer(uid, ws);

    this.socketInterface.listenTo(ws, (message) => {
      console.log("Got Message", message);
      if (message.isType(ISocketMessageType.actions)) {
        const gameAction = new GameAction(message.data.type, message.data.data);
        this.actionMap.append(ws, gameAction);
      } else if (message.isType(ISocketMessageType.getChunk)) {
        this.sendChunkTo(message.data.pos, ws);
      }
    });
  }
}
