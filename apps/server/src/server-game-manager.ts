import {
  Chunk,
  ChunkPos,
  EntityActionDto,
  Game,
  GameDiff,
  SandBoxGScript,
} from "@craft/rust-world";
import SocketServer from "./socket";
import WebSocket from "ws";
import {
  deserializeGame,
  ISerializedChunk,
  ISerializedGame,
  ISocketMessageType,
  SocketMessage,
} from "@craft/engine";
import { GameDb } from "./db";
import { makeLogger } from "./logger.js";
import { add_script_to_registry } from "@craft/rust-world";

type ClientId = number;

const AUTO_SAVE_GAME = false;
const AUTO_SAVE_GAME_INTERVAL = 5000;

const makeGameLogger = (gameId: string) => {
  return makeLogger(`ServerGameManager:${gameId}`);
};

class ServerGameManagerGameScript {
  static name = "ServerGameManagerGameScript";

  private updatedChunks: Set<number> = new Set();

  static register() {
    add_script_to_registry(ServerGameManagerGameScript);
  }

  onScriptMounted(allChunkIds: Set<number>, allEntityIds: Set<number>): void {
    console.log(
      "ServerGameManagerGameScript onScriptMounted",
      allChunkIds,
      allEntityIds
    );
  }

  onChunkUpdate(chunkId: number): void {
    console.log("ServerGameManagerGameScript onChunkUpdate", chunkId);
    this.updatedChunks.add(chunkId);
  }

  onEntityUpdate(entityId: number): void {
    console.log("ServerGameManagerGameScript onEntityUpdate", entityId);
  }

  getUpdatedChunks(): number[] {
    const chunks = Array.from(this.updatedChunks);
    this.updatedChunks.clear();
    return chunks;
  }
}

ServerGameManagerGameScript.register();

export class ServerGameManager {
  clients: Map<ClientId, WebSocket> = new Map();
  scriptsToSendToClients: string[] = [];
  timer: NodeJS.Timeout | null = null;
  autoSaveTimer: NodeJS.Timeout | null = null;
  is_running = false;
  log: (...args: any[]) => void;

  static async create(
    gameDto: ISerializedGame,
    socketService: SocketServer,
    gameDb: GameDb
  ): Promise<ServerGameManager> {
    const game = deserializeGame(gameDto);
    const log = makeGameLogger(game.id);
    game.ensureScript(SandBoxGScript.name());

    game.run_scripts();

    async function task() {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    let pendingChunkCount = game.getPendingChunkCount();

    log("Loading chunks", pendingChunkCount);

    while (pendingChunkCount > 0) {
      log("Loading chunk", pendingChunkCount);
      await task();
      game.add_single_chunk();
      pendingChunkCount = game.getPendingChunkCount();
    }

    return new ServerGameManager(game, socketService, gameDb);
  }

  constructor(
    private game: Game,
    private socketInterface: SocketServer,
    private gameDb: GameDb
  ) {
    this.log = makeGameLogger(game.id);
    this.log("Creating game");

    this.socketInterface.listenForConnection((ws) => {
      this.listenForJoinRequests(ws);
    });

    game.ensureScript(ServerGameManagerGameScript.name);
    game.add_all_scripts();
  }

  private getGameManagerGameScript(): ServerGameManagerGameScript {
    return this.game.getScriptState(
      ServerGameManagerGameScript.name
    ) as ServerGameManagerGameScript;
  }

  listenForJoinRequests(ws: WebSocket) {
    this.socketInterface.listenTo(ws, async (message) => {
      this.log("Socket message from client", message);
      if (!message.isType(ISocketMessageType.joinWorld)) {
        return;
      }
      this.log("Joining game", message.data);
      const { gameId, myUid } = message.data;
      if (gameId !== this.game.id) {
        return;
      }

      this.game.makeAndAddPlayer(myUid);

      const entities = this.game.serializeEntities();

      this.log("Entities", JSON.stringify(entities, null, 2));

      // load chunks around the player
      this.game.run_scripts();

      async function task() {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      let pendingChunkCount = this.game.getPendingChunkCount();

      this.log("Loading chunks", pendingChunkCount);

      while (pendingChunkCount > 0) {
        this.log("Loading chunk", pendingChunkCount);
        await task();
        this.game.add_single_chunk();
        pendingChunkCount = this.game.getPendingChunkCount();
      }

      // send welcome message
      this.socketInterface.send(
        ws,
        new SocketMessage(ISocketMessageType.welcome, {
          uid: myUid,
          entities: entities,
        })
      );

      const entity = this.game.getEntityById(myUid);
      if (!entity) {
        console.error("Player not found in join request", myUid);
        return;
      }

      this.clients.forEach((client, _) => {
        this.socketInterface.send(
          client,
          new SocketMessage(ISocketMessageType.newPlayer, entity.to_js())
        );
      });

      this.listenForPlayerActions(ws, myUid);

      this.clients.set(myUid, ws);
    });
  }

  listenForPlayerActions(ws: WebSocket, clientId: ClientId) {
    this.socketInterface.listenTo(ws, (message) => {
      this.log("Socket message from client", JSON.stringify(message));
      if (!message.isType(ISocketMessageType.actions)) {
        return;
      }
      const action = message.data;
      this.log("Received Action", JSON.stringify(action, null, 2));

      const actionDto = EntityActionDto.from_js(action);

      this.game.handleAction(actionDto);

      // send action to all clients (except the one that sent it)
      this.clients.forEach((client, uid) => {
        if (uid === clientId) {
          return;
        }
        this.socketInterface.send(client, message);
      });
    });
  }

  // onGameUpdate(diff: GameDiff, scriptName: string): void {
  //   this.log("onGameUpdate", diff, scriptName);

  //   if (this.scriptsToSendToClients.includes(scriptName)) {
  //     for (const client of this.clients.values()) {
  //       this.socketInterface.send(
  //         client,
  //         new SocketMessage(ISocketMessageType.gameDiff, diff)
  //       );
  //     }
  //   }
  // }

  // onChunkUpdate(chunkId: number): void {
  //   this.log("onChunkUpdate", chunkId);
  //   const diff = new GameDiff();
  //   diff.add_chunk(BigInt(chunkId));
  //   for (const client of this.clients.values()) {
  //     this.socketInterface.send(
  //       client,
  //       new SocketMessage(ISocketMessageType.gameDiff, diff)
  //     );
  //   }
  // }

  update() {
    this.game.update();
    // send game diff to clients
    const updatedChunks = this.getGameManagerGameScript().getUpdatedChunks();
    if (updatedChunks.length > 0) {
      const diff = new GameDiff();
      for (const chunkId of updatedChunks) {
        diff.add_chunk(BigInt(chunkId));
      }
      const diffJs = diff.to_js();
      console.log("Sending game diff", diffJs);

      for (const client of this.clients.values()) {
        this.socketInterface.send(
          client,
          new SocketMessage(ISocketMessageType.gameDiff, diffJs)
        );
      }
    }
  }

  start() {
    this.log("Starting game");
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      this.update();
    }, 1000 / 60);

    if (AUTO_SAVE_GAME) {
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
      }
      this.autoSaveTimer = setInterval(() => {
        this.log("Saving game");
        this.save();
      }, AUTO_SAVE_GAME_INTERVAL);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  getOrRequestChunk(x: number, y: number): ISerializedChunk | null {
    const chunkPos = new ChunkPos(x, y);
    try {
      const chunk = this.game.getChunk(chunkPos);
      const serializedChunk = chunk.serialize();
      return serializedChunk;
    } catch (error) {
      this.game.request_chunk(chunkPos);
      this.log("Requested chunk", chunkPos);
      return null;
    }
  }

  getOnlinePlayers(): number {
    return this.clients.size;
  }

  save() {
    this.gameDb.saveGame(this.game);
  }
}
