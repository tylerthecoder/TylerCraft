import {
  CONFIG,
  GameAction,
  GameStateDiff,
  ICreateGameOptions,
  ISocketMessageType,
  Player,
  PlayerAction,
  SocketMessage,
  SocketMessageDto,
  Vector2D,
  handlePlayerAction,
} from "@craft/engine";
import { ServerWebSocket } from "bun";
import { IGameService } from "./game-service";

const webClientPath = new URL("../../web-client/dist", import.meta.url)
  .pathname;
console.log("Serving web client, path: ", webClientPath);

interface WebsocketData {
  gameId: string;
  userId: string;
}

export const startServer = async (gameService: IGameService) => {
  Bun.serve({
    fetch: async (req, server) => {
      const url = new URL(req.url);

      if (url.pathname === "/worlds") {
        const worlds = await gameService.getAllWorlds();
        return new Response(JSON.stringify(worlds));
      }

      if (url.pathname === "/create-game") {
        const options = await req.json<ICreateGameOptions>();
        const world = await gameService.createGame(options);
        return new Response(JSON.stringify(world));
      }

      if (url.pathname === "/join-game") {
        const worldId = url.searchParams.get("worldId");
        if (!worldId) {
          return new Response("No world id provided", { status: 400 });
        }
        const userId = url.searchParams.get("userId");
        if (!userId) {
          return new Response("No user id provided", { status: 400 });
        }
        const game = await gameService.getWorld(worldId);
        if (!game) {
          return new Response("World not found", { status: 404 });
        }
        server.upgrade(req, { data: { worldId, userId } });
      }

      // all other requests are for staticly served files
      const filePath = new URL(webClientPath, url).pathname;

      const file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file);
      }

      return new Response("404!");
    },
    websocket: {
      async open(ws: ServerWebSocket<WebsocketData>) {
        console.log("Client connected");
        const { gameId, userId } = ws.data;

        const game = await gameService.getWorld(gameId);
        if (!game) {
          console.error("World not found");
          return;
        }

        const welcomeMessage = new SocketMessage(ISocketMessageType.welcome, {
          uid: userId,
          worldId: gameId,
          entities: game.entities.serialize(),
          // activePlayers: Array.from(this.players.values()).map((p) => p.uid),
          config: CONFIG,
          name: game.name,
        });

        ws.send(JSON.stringify(welcomeMessage.getDto()));

        // sub to game
        ws.subscribe("game-" + gameId);

        // Tell others
        const gameDiff = new GameStateDiff(game);
        gameDiff.addEntity(userId);

        ws.publish(
          "game-" + gameId,
          JSON.stringify(
            new SocketMessage(
              ISocketMessageType.gameDiff,
              gameDiff.get()
            ).getDto()
          )
        );
      },
      async message(ws: ServerWebSocket<WebsocketData>, messageRaw) {
        const { gameId, userId } = ws.data;

        const game = await gameService.getWorld(gameId);
        if (!game) {
          console.error("World not found");
          return;
        }

        const message = (() => {
          try {
            if (typeof messageRaw !== "string") {
              return;
            }
            const msg = JSON.parse(messageRaw) as SocketMessageDto;
            return new SocketMessage(msg.type, msg.data);
          } catch {
            console.log("Error parsing JSON");
          }
        })();

        if (!message) {
          return;
        }

        if (message.isType(ISocketMessageType.playerActions)) {
          const playerAction = new PlayerAction(
            message.data.type,
            message.data.data
          );

          const player = game.entities.get<Player>(userId);

          handlePlayerAction(game, player, playerAction);

          ws.publish(
            "game-" + gameId,
            JSON.stringify(
              new SocketMessage(
                ISocketMessageType.playerActions,
                playerAction.getDto()
              )
            )
          );

          return;
        }

        if (message.isType(ISocketMessageType.actions)) {
          const { data, type } = message.data;
          const gameAction = new GameAction(type, data);
          game.handleAction(gameAction);

          // Let everyone know what happened
          const stateDiff = game.stateDiff.get();

          ws.publish(
            "game-" + gameId,
            JSON.stringify(
              new SocketMessage(ISocketMessageType.gameDiff, stateDiff).getDto()
            )
          );

          return;
        }

        if (message.isType(ISocketMessageType.getChunk)) {
          const { pos } = message.data;

          const chunkPos = Vector2D.fromIndex(pos);
          let chunk = game.world.getChunkFromPos(chunkPos);
          if (!chunk) {
            await game.world.chunks.immediateLoadChunk(chunkPos);
            chunk = game.world.getChunkFromPos(chunkPos);
            if (!chunk) {
              console.error("Chunk not found");
              return;
            }
          }

          ws.send(
            JSON.stringify(
              new SocketMessage(
                ISocketMessageType.setChunk,

                {
                  pos,
                  data: chunk.serialize(),
                }
              ).getDto()
            )
          );
        }
      },

      async close(ws: ServerWebSocket<WebsocketData>) {
        console.log("Client disconnected");
        const { gameId, userId } = ws.data;

        const game = await gameService.getWorld(gameId);
        if (!game) {
          console.error("World not found");
          return;
        }

        // This really should alter the gamediff itself, or return one
        game.entities.removePlayer(userId);

        console.log(
          `Remove Player! ${game.entities.getActivePlayers().length} players`
        );

        const gameDiff = new GameStateDiff(game);
        gameDiff.removeEntity(userId);

        ws.publish(
          "game-" + gameId,
          JSON.stringify(
            new SocketMessage(
              ISocketMessageType.gameDiff,
              gameDiff.get()
            ).getDto()
          )
        );
      },
    },
  });
};

start()
  .then(() => console.log("Server started"))
  .catch((err) => console.error(err));
