import {
  deserializeChunk,
  ISerializedChunk,
  IServerGameMetadata,
  ISocketMessageType,
  SocketMessage,
  WelcomeMessage,
} from "@craft/engine";
import { SocketHandler, SocketListener } from "../socket";
import { AppConfig } from "../appConfig";
import {
  EntityActionDto,
  EntityActionJson,
  Game,
  SandBoxGScript,
  WasmGameScript,
  WasmRequestChunk,
} from "@craft/rust-world";
import { CanvasGameScript } from "../game-scripts/canvas-gscript";
import { WebGlGScript } from "../game-scripts/webgl-gscript";
import { getMyUid } from "../utils";
import { KeyboardPlayerEntityController } from "../controllers/playerControllers/keyboardPlayerController";

export const SocketInterface = new SocketHandler();

const baseUrl = AppConfig.api.baseUrl;

export async function getAllGames(): Promise<IServerGameMetadata[]> {
  const response = await fetch(`${baseUrl}/games`);
  return await response.json();
}

export async function createGame(name: string): Promise<string> {
  const response = await fetch(`${baseUrl}/game`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return await response.text();
}

export async function startGame(gameId: string): Promise<void> {
  await fetch(`${baseUrl}/game/${gameId}/start`, {
    method: "POST",
  });
}

export async function serverRunner(gameId: string) {
  async function joinGame(gameId: string): Promise<WelcomeMessage> {
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.joinWorld, {
        gameId,
        myUid: getMyUid(),
      })
    );

    const welcomeMessage = await waitForWelcomeMessage();
    console.log("Welcome message", welcomeMessage);

    if (!welcomeMessage) {
      throw new Error("Server didn't create the world");
    }
    return welcomeMessage;
  }

  async function waitForWelcomeMessage() {
    let listener: SocketListener | null = null;
    const welcomeMessage: WelcomeMessage | null = await new Promise(
      (resolve) => {
        listener = (message) => {
          console.log("SocketMessage", message);
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

  await SocketInterface.connect(() => {
    console.error("Socket disconnected");
  });

  const welcomeMessage = await joinGame(gameId);

  console.log("Joined game", welcomeMessage);

  const myUid = getMyUid();

  const game = new Game();
  (window as any).game = game;

  game.deserialize_entities_wasm(welcomeMessage.entities);

  console.log(game.serialize_entities_wasm());

  const webglGameScript = new WebGlGScript(game);

  const canvasGameScript = new CanvasGameScript(game, webglGameScript, myUid);
  const wasmCanvasGameScript = new WasmGameScript(canvasGameScript);
  game.add_game_script_wasm(wasmCanvasGameScript);
  const chunksToInsert: ISerializedChunk[] = [];

  const onAction = (action: EntityActionDto) => {
    console.log("Player Action", action);
    const entityId = action.entity_id;
    const name = action.get_name();
    const data = EntityActionJson.from_entity_action_dto(action);
    game.handle_action_wasm(action);
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.actions, {
        entity_id: entityId,
        name,
        data,
      })
    );
  };

  const playerController = new KeyboardPlayerEntityController(
    onAction,
    myUid,
    canvasGameScript,
    webglGameScript
  );

  const getChunk = async (chunkPos: { x: number; y: number }) => {
    console.log("Getting chunk", chunkPos);
    fetch(`${baseUrl}/game/${gameId}/chunk/${chunkPos.x}/${chunkPos.y}`)
      .then((data) => data.json())
      .then((chunk) => {
        chunksToInsert.push(chunk.Ok);
      });
  };

  const chunkRequester = new WasmRequestChunk(getChunk);

  // add sandbox
  const sandbox = new SandBoxGScript(1, chunkRequester);
  game.add_sandbox_wasm(sandbox);

  console.log(game.serialize_entities_wasm());

  const gameLoop = async () => {
    const chunkToInsert = chunksToInsert.pop();
    if (chunkToInsert) {
      const chunk = deserializeChunk(chunkToInsert);
      game.schedule_chunk_insert_wasm(chunk);
    }

    game.update();
    playerController.update();
    canvasGameScript.update();
    canvasGameScript.renderLoop(0);
  };

  setInterval(gameLoop, 1000 / 60);
}
