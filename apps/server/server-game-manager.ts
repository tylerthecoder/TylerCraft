import {
  Chunk,
  Game,
  GameDiff,
  SandBoxGScript,
  TerrainGenerator,
  WasmRequestChunk,
} from "@craft/rust-world";
import SocketServer from "./socket";
import WebSocket from "ws";
import { ISocketMessageType, SocketMessage } from "@craft/engine";

type ClientId = string;

interface ScriptDiff {
  scriptName: string;
  diff: GameDiff;
}

class TerrainChunkGetter {
  private chunks_to_insert: Chunk[] = [];
  public terrianGen: TerrainGenerator;

  constructor(private game: Game) {
    this.terrianGen = new TerrainGenerator(0, true, false);
  }

  getChunk(chunkPos: { x: number; y: number }) {
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

  constructor(private game: Game, private socketInterface: SocketServer) {
    const chunkGetter = new TerrainChunkGetter(game);
    const sandbox = new SandBoxGScript(1, chunkGetter.getWasmRequestChunk());
    game.add_sandbox_wasm(sandbox);
  }

  listenForJoinRequests(ws: WebSocket) {
    this.socketInterface.listenTo(ws, (message) => {
      if (!message.isType(ISocketMessageType.joinWorld)) {
        return;
      }
      const { worldId, myUid } = message.data;
      if (worldId !== this.game.id) {
        return;
      }

      // send welcome message
      this.socketInterface.send(
        ws,
        new SocketMessage(ISocketMessageType.welcome, {
          uid: myUid,
          entities: this.game.serialize_entities_wasm(),
        })
      );

      this.listenForPlayerActions(ws, myUid);

      this.clients.set(myUid, ws);
    });
  }

  listenForPlayerActions(ws: WebSocket, clientId: ClientId) {
    this.socketInterface.listenTo(ws, (message) => {
      if (!message.isType(ISocketMessageType.actions)) {
        return;
      }
      const action = message.data;

      this.game.handle_action_wasm(action);

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
    const scriptDiffs: ScriptDiff[] = this.game.update();

    for (const scriptDiff of scriptDiffs) {
      this.onGameUpdate(scriptDiff.diff, scriptDiff.scriptName);
    }
  }

  start() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      this.update();
    }, 1000 / 60);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getChunk(chunkPos: { x: number; y: number }): Chunk | ChunkNotLoaded {
    return this.game.get_chunk(chunkPos);
  }

  getOnlinePlayers(): number {
    return this.clients.size;
  }
}
