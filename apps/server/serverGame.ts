import Players from "./players.js";
import WebSocket from "ws";
import { SocketInterface } from "./app.js";
import { EmptyController, Game, GameAction, GameActionDto, GameActionHolder, GameStateDiff, ISocketMessage, ISocketMessageType, IWorldData, MapArray, Vector2D, WorldModel, GameController, EntityHolder, World } from "@craft/engine";

export class ServerGame extends Game {
  public clients: Players;
  public actionMap: MapArray<WebSocket, GameActionDto> = new MapArray();

  public controller: GameController<GameAction> = new EmptyController(this);

  static async make(
    worldData: IWorldData,
    worldModel: WorldModel,
  ): Promise<ServerGame> {

    const entityHolder = new EntityHolder(worldData.data?.entities);
    const world = await World.make(
      worldData.chunkReader,
      worldData.data?.world,
    )

    const game = new ServerGame(entityHolder, world, worldModel, worldData);

    return game;
  }


  constructor(
    entities: EntityHolder,
    world: World,
    worldModel: WorldModel,
    worldData: IWorldData,
  ) {
    super(entities, world, worldModel, worldData);

    this.clients = new Players(this);
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
    const clientDiffs = new Map<WebSocket, GameStateDiff>();
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

  private async sendChunkTo(chunkPosString: string, ws: WebSocket) {
    const chunkPos = Vector2D.fromIndex(chunkPosString);
    let chunk = this.world.getChunkFromPos(chunkPos);
    if (!chunk) {
      await this.world.chunks.immediateLoadChunk(chunkPos);
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

  addSocket(uid: string, ws: WebSocket): void {
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