import {
  Chunk,
  ChunkNotLoadedError,
  EntityActionDto,
  Game,
  GameDiff,
  SandBoxGScript,
  TerrainGenerator,
  Vec2i16,
} from "@craft/rust-world";
import SocketServer from "./socket";
import WebSocket from "ws";
import { ISocketMessageType, SocketMessage } from "@craft/engine";
import { GameDb } from "./db";

type ClientId = number;

class TerrainChunkGetter {
  private chunks_to_insert: Chunk[] = [];
  public terrianGen: TerrainGenerator;

  constructor(private game: Game) {
    this.terrianGen = new TerrainGenerator(0, true, false);
  }

  getChunk(chunkPos: { x: number; y: number }) {
    console.log("Getting chunk", chunkPos);
    const chunk = this.terrianGen.get_chunk(chunkPos.x, chunkPos.y);
    this.chunks_to_insert.push(chunk);
  }

  update() {
    for (const chunk of this.chunks_to_insert) {
      this.game.schedule_chunk_insert_wasm(chunk);
    }
    this.chunks_to_insert = [];
  }

  getWasmRequestChunk() {
    return new WasmRequestChunk(this.getChunk.bind(this));
  }
}

export class ServerGameManager {
  is_running = false;
  clients: Map<ClientId, WebSocket> = new Map();
  scriptsToSendToClients: string[] = [];
  timer: NodeJS.Timeout | null = null;
  chunkGetter: TerrainChunkGetter;

  constructor(
    private game: Game,
    private socketInterface: SocketServer,
    private gameDb: GameDb
  ) {
    this.chunkGetter = new TerrainChunkGetter(game);
    const sandbox = new SandBoxGScript(
      1,
      this.chunkGetter.getWasmRequestChunk()
    );
    game.add_sandbox_wasm(sandbox);

    this.socketInterface.listenForConnection((ws) => {
      this.listenForJoinRequests(ws);
    });
  }

  listenForJoinRequests(ws: WebSocket) {
    this.socketInterface.listenTo(ws, (message) => {
      console.log("Socket message from client", message);
      if (!message.isType(ISocketMessageType.joinWorld)) {
        return;
      }
      const { gameId, myUid } = message.data;
      if (gameId !== this.game.id) {
        return;
      }

      this.game.make_and_add_player_wasm(myUid);

      const entities = this.game.getAllEntities();

      console.log("Entities", JSON.stringify(entities, null, 2));

      // send welcome message
      this.socketInterface.send(
        ws,
        new SocketMessage(ISocketMessageType.welcome, {
          uid: myUid,
          entities: entities,
        })
      );

      const entity = this.game.entities.get_entity(myUid);
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
      console.log("Socket message from client", JSON.stringify(message));
      if (!message.isType(ISocketMessageType.actions)) {
        return;
      }
      const action = message.data;
      console.log("Received Action", JSON.stringify(action, null, 2));

      const actionDto = EntityActionDto.from_js(action);

      this.game.handle_action_wasm(actionDto);

      // send action to all clients (except the one that sent it)
      this.clients.forEach((client, uid) => {
        if (uid === clientId) {
          return;
        }
        this.socketInterface.send(client, message);
      });
    });
  }

  onGameUpdate(diff: GameDiff, scriptName: string): void {
    console.log("ServerGameScript: onGameUpdate", diff, scriptName);

    if (this.scriptsToSendToClients.includes(scriptName)) {
      for (const client of this.clients.values()) {
        this.socketInterface.send(
          client,
          new SocketMessage(ISocketMessageType.gameDiff, diff)
        );
      }
    }
  }

  update() {
    this.game.update();
    this.chunkGetter.update();

    // const scriptDiffs: ScriptDiff[] = this.game.update();
    // for (const scriptDiff of scriptDiffs) {
    //   this.onGameUpdate(scriptDiff.diff, scriptDiff.scriptName);
    // }
  }

  start() {
    console.log("Starting game", this.game.id);
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      this.update();
    }, 1000 / 60);

    setInterval(() => {
      console.log("Saving game", this.game.id);
      this.save();
    }, 5000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getChunk(chunkPos: { x: number; y: number }): {
    Ok: Chunk;
    Err: ChunkNotLoadedError;
  } {
    const chunkPosWasm = new Vec2i16(chunkPos.x, chunkPos.y);
    return this.game.get_chunk_wasm(chunkPosWasm);
  }

  getOnlinePlayers(): number {
    return this.clients.size;
  }

  save() {
    this.gameDb.saveGame(this.game);
  }
}
