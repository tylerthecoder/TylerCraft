import { describe, expect, test } from "bun:test";
import { IGameService } from "./game-service";

const mockGameService: IGameService = {
  createGame: async () => {
    // noop
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
  test("It can get the worlds", () => {});
});
