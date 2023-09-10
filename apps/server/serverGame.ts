import Players from "./players.js";
import WebSocket from "ws";
import {
  EmptyController,
  Game,
  GameAction,
  GameStateDiff,
  ISocketMessageType,
  MapArray,
  Vector2D,
  GameController,
  EntityHolder,
  World,
  SocketMessage,
  IGameData,
} from "@craft/engine";
import { SocketInterface } from "./server.js";

export class ServerGame extends Game {
  public clients: Players;
  public actionMap: MapArray<WebSocket, GameAction> = new MapArray();

  public controller: GameController = new EmptyController(this);

  static async make(gameData: IGameData): Promise<ServerGame> {
    console.log("Making server game", gameData);
    const entityHolder = new EntityHolder(gameData.data?.entities);

    // Remove all players since none are connected yet
    entityHolder.removeAllPlayers();

    const world = await World.make(gameData.chunkReader, gameData.data?.world);

    const game = new ServerGame(entityHolder, world, gameData);

    return game;
  }

  constructor(entities: EntityHolder, world: World, gameData: IGameData) {
    super(entities, world, gameData);

    this.clients = new Players(this);
  }

  onGameAction(_action: GameAction): void {
    // NO-OP
  }

  update(_delta: number): void {
    // Send the initial state diff to all clients
    // This state diff has no client sent actions so it should
    // only be passive things (An entity spawning)
    if (this.stateDiff.hasData()) {
      this.clients.sendMessageToAll(
        new SocketMessage(ISocketMessageType.gameDiff, this.stateDiff.get())
      );
    }

    this.stateDiff.clear();

    // Run through each client's actions and save the combined state diff
    // from the other client's actions. Combining them lets us send all client
    // updates as one socket message.

    // Set the initial state diff for each client
    const clientDiffs = new Map<WebSocket, GameStateDiff>();
    for (const ws of this.clients.getSockets()) {
      clientDiffs.set(ws, this.stateDiff.copy());
    }

    if (this.actionMap.size > 0) {
      for (const actions of this.actionMap.values()) {
        console.log("Actions", actions);
      }
    }

    for (const [ws, actions] of this.actionMap.entries()) {
      this.stateDiff.clear();

      // Handle all the actions. The new diff should only have updates
      // for the player who made them and chunk they might have affected
      for (const action of actions) {
        this.handleAction(action);
      }

      console.log("Diff after actions", this.stateDiff.get());

      // Append the diff to all clients but the one that sent the actions
      this.clients
        .getSockets()
        .filter((s) => s !== ws)
        .forEach((s) => {
          clientDiffs.get(s)?.append(this.stateDiff);
        });
    }

    // Send the combined state diff to all clients
    for (const [ws, diff] of clientDiffs.entries()) {
      if (diff.hasData()) {
        const diffData = diff.get();
        console.log("Sending diff", diffData);
        SocketInterface.send(
          ws,
          new SocketMessage(ISocketMessageType.gameDiff, diffData)
        );
      }
    }

    this.actionMap.clear();
  }

  private async sendChunkTo(chunkPosString: string, ws: WebSocket) {
    const chunkPos = Vector2D.fromIndex(chunkPosString);
    let chunk = this.world.getChunkFromPos(chunkPos);
    if (!chunk) {
      await this.world.chunks.immediateLoadChunk(chunkPos);
      chunk = this.world.getChunkFromPos(chunkPos);
    }
    if (!chunk) throw new Error("Chunk wasn't found");
    const serializedData = chunk.serialize();
    SocketInterface.send(
      ws,
      new SocketMessage(ISocketMessageType.setChunk, {
        pos: chunkPosString,
        data: serializedData,
      })
    );
  }

  addSocket(uid: string, ws: WebSocket): void {
    this.clients.addPlayer(uid, ws);

    SocketInterface.listenTo(ws, (message) => {
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
