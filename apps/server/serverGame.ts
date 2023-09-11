import WebSocket from "ws";
import {
  EmptyController,
  Game,
  GameAction,
  MapArray,
  GameController,
  EntityHolder,
  World,
  IGameData,
} from "@craft/engine";

export class ServerGame extends Game {
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
  }

  onGameAction(_action: GameAction): void {
    // NO-OP
  }

  update(_delta: number): void {
    // Send the initial state diff to all clients
    // This state diff has no client sent actions so it should
    // only be passive things (An entity spawning)
    // if (this.stateDiff.hasData()) {
    //   this.clients.sendMessageToAll(
    //     new SocketMessage(ISocketMessageType.gameDiff, this.stateDiff.get())
    //   );
    // }
  }
}
