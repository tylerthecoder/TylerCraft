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
import { ISocketMessageType, SocketMessage } from "@craft/engine";
import { GameDb } from "./db";
import { makeLogger } from "./logger.js";

type ClientId = number;

const log = makeLogger("ServerGameManager");

export class ServerGameManager {
  is_running = false;
  clients: Map<ClientId, WebSocket> = new Map();
  scriptsToSendToClients: string[] = [];
  timer: NodeJS.Timeout | null = null;

  constructor(
    private game: Game,
    private socketInterface: SocketServer,
    private gameDb: GameDb
  ) {
    console.log("ServerGameManager constructor", game.id);
    game.ensureScript(SandBoxGScript.name());

    this.socketInterface.listenForConnection((ws) => {
      this.listenForJoinRequests(ws);
    });
  }

  listenForJoinRequests(ws: WebSocket) {
    this.socketInterface.listenTo(ws, (message) => {
      log("Socket message from client", message);
      if (!message.isType(ISocketMessageType.joinWorld)) {
        return;
      }
      log("Joining game", message.data);
      const { gameId, myUid } = message.data;
      if (gameId !== this.game.id) {
        return;
      }

      this.game.makeAndAddPlayer(myUid);

      const entities = this.game.serializeEntities();

      log("Entities", JSON.stringify(entities, null, 2));

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
      log("Socket message from client", JSON.stringify(message));
      if (!message.isType(ISocketMessageType.actions)) {
        return;
      }
      const action = message.data;
      log("Received Action", JSON.stringify(action, null, 2));

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

  getChunk(x: number, y: number): Chunk {
    const chunkPos = new ChunkPos(x, y);
    return this.game.getChunk(chunkPos);
  }

  getOnlinePlayers(): number {
    return this.clients.size;
  }

  save() {
    this.gameDb.saveGame(this.game);
  }
}
