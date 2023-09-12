import { beforeAll, describe, expect, test } from "bun:test";
import { IGameService, RamChunkReader } from "./game-service";
import { startServer } from "./server";
import { Server } from "bun";
import { ServerGame } from "./server-game";
import { CONFIG } from "@craft/engine";

const mockGameService: IGameService = {
  createGame: async () => {
    // noop

    return ServerGame.make({
      name: "Test World",
      id: "123",
      config: CONFIG,
      gameSaver: {
        save: async () => {
          // noop
        },
      },
      chunkReader: new RamChunkReader(),
    });
  },
  getAllWorlds: async () => {
    return [
      {
        name: "Test World",
        gameId: "123",
      },
    ];
  },
  getWorld: async () => {
    return null;
  },
};

describe("Server", () => {
  let server: Server;

  beforeAll(async () => {
    server = await startServer(mockGameService);
  });

  test("It can get the worlds", async () => {
    const res = await server.fetch("/worlds");
    const data = await res.json();
    expect(data.length).toBe(1);
  });

  test("It creates a game", async () => {
    const res = await server.fetch(
      new Request({
        url: `http://${server.hostname}:${server.port}/create-game`,
        method: "POST",
        body: JSON.stringify({
          name: "New world",
          config: CONFIG,
        }),
      })
    );

    const gameId = await res.text();

    expect(gameId).toBeTruthy();
  });

  test("It can join a game", async () => {
    // connect to websocket
    // const socket = new WebSocket(
    //   `ws://${server.hostname}:${server.port}/join-game?worldId=123&userId=456`
    // );
  });
});
