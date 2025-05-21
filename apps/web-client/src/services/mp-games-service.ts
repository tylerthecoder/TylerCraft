import {
  deserializeChunk,
  ISerializedChunk,
  ISerializedGame,
  IServerGameMetadata,
  ISocketMessageType,
  serializedGameToGame,
  SocketMessage,
} from "@craft/engine";
import { SocketListener } from "../socket";
import { SocketInterface } from "../app";
import { ISocketWelcomePayload } from "@craft/engine/types";
import { AppConfig } from "../appConfig";
import { Game, SandBoxGScript, WasmRequestChunk } from "@craft/rust-world";

async function serverRunner() {
  const baseUrl = AppConfig.api.baseUrl;

  async function getAllGames(): Promise<IServerGameMetadata[]> {
    const response = await fetch(`${baseUrl}/worlds`);
    return await response.json();
  }

  async function createGame(name: string): Promise<Game> {
    const response = await fetch(`${baseUrl}/game`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    const serializedGame: ISerializedGame = await response.json();
    return serializedGameToGame(serializedGame);
  }

  async function startGame(gameId: string): Promise<void> {
    await fetch(`${baseUrl}/game/${gameId}/start`, {
      method: "POST",
    });
  }

  async function joinGame(gameId: string): Promise<void> {
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.joinWorld, undefined)
    );

    const welcomeMessage = await waitForWelcomeMessage();

    if (!welcomeMessage) {
      throw new Error("Server didn't create the world");
    }
  }

  async function waitForWelcomeMessage() {
    let listener: SocketListener | null = null;
    const welcomeMessage: ISocketWelcomePayload | null = await new Promise(
      (resolve) => {
        listener = (message) => {
          if (message.isType(ISocketMessageType.welcome)) {
            resolve(message.data);
          } else if (message.isType(ISocketMessageType.failedToJoin)) {
            resolve(null);
            console.error("Requested world not found");
          }
        };
        SocketInterface.addListener(listener);
      }
    );
    SocketInterface.removeListener(listener!);
    return welcomeMessage;
  }

  const gameId = "1";

  await joinGame(gameId);

  const game = new Game();
  const chunksToInsert: ISerializedChunk[] = [];

  const getChunk = async (chunkPos: { x: number; y: number }) => {
    fetch(`${baseUrl}/game/${gameId}/chunk/${chunkPos.x}/${chunkPos.y}`)
      .then((data) => data.json())
      .then((chunk) => {
        chunksToInsert.push(chunk);
      });
  };

  const chunkRequester = new WasmRequestChunk(getChunk);

  // add sandbox
  const sandbox = new SandBoxGScript(1, chunkRequester);
  game.add_sandbox_wasm(sandbox);

  const gameLoop = async () => {
    const chunkToInsert = chunksToInsert.pop();
    if (chunkToInsert) {
      const chunk = deserializeChunk(chunkToInsert);
      game.schedule_chunk_insert_wasm(chunk);
    }

    game.update();
  };
}
