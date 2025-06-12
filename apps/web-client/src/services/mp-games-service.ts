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
  Entities,
  Entity,
  EntityActionDto,
  Game,
  SandBoxGScript,
  WasmGameScript,
} from "@craft/rust-world";
import { CanvasGameScript } from "../game-scripts/canvas-gscript";
import { WebGlGScript } from "../game-scripts/webgl-gscript";
import { getMyUid } from "../utils";
import { KeyboardPlayerEntityController } from "../controllers/playerControllers/keyboardPlayerController";
import { HudGScript } from "../game-scripts/hudRender";

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

  console.log("My UID", myUid);

  const game = new Game();
  (window as any).game = game;

  const entities = Entities.from_js(welcomeMessage.entities);

  const webglGameScript = new WebGlGScript(game);

  const canvasGameScript = new CanvasGameScript(game, webglGameScript, myUid);
  const wasmCanvasGameScript = new WasmGameScript(canvasGameScript);
  const hudRender = new HudGScript(game, canvasGameScript, myUid);
  game.add_game_script_wasm(wasmCanvasGameScript);
  const chunksToInsert: ISerializedChunk[] = [];

  const onAction = (action: EntityActionDto) => {
    console.log("Player Action", action);
    const data = action.to_js();
    game.handle_action_wasm(action);
    SocketInterface.send(SocketMessage.make(ISocketMessageType.actions, data));
  };

  SocketInterface.addListener((message) => {
    console.log("Got actions message from server", message);
    if (message.isType(ISocketMessageType.actions)) {
      const action = message.data;
      const actionDto = EntityActionDto.from_js(action);
      game.handle_action_wasm(actionDto);
    }
    if (message.isType(ISocketMessageType.newPlayer)) {
      const player = message.data;
      game.entities.add_entity(Entity.from_js(player));
    }
  });

  const playerController = new KeyboardPlayerEntityController(
    game,
    onAction,
    () => {
      // NO-OP
    },
    myUid,
    canvasGameScript
  );

  const fetchingChunk = new Set<string>();
  const getChunk = async (chunkPos: { x: number; y: number }) => {
    if (fetchingChunk.has(chunkPos.x + "," + chunkPos.y)) {
      return;
    }
    console.log("Getting chunk", chunkPos);
    fetchingChunk.add(chunkPos.x + "," + chunkPos.y);
    fetch(`${baseUrl}/game/${gameId}/chunk/${chunkPos.x}/${chunkPos.y}`)
      .then((data) => data.json())
      .then((chunk) => {
        chunksToInsert.push(chunk.Ok);
        fetchingChunk.delete(chunkPos.x + "," + chunkPos.y);
      });
  };

  const chunkRequester = new WasmRequestChunk(getChunk);

  // add sandbox
  const sandbox = new SandBoxGScript(1, chunkRequester);

  // Load initial chunks
  const chunksAroundPlayer = sandbox.get_chunks_around_player(
    entities.get_entity_by_id_clone(myUid)!.as_player().pos
  );
  console.log("Chunks around player", chunksAroundPlayer);
  for (const chunkPos of chunksAroundPlayer) {
    getChunk(chunkPos);
  }

  // load all the first chunks
  while (fetchingChunk.size > 0 || chunksToInsert.length > 0) {
    const chunkToInsert = chunksToInsert.pop();
    if (chunkToInsert) {
      console.log("Inserting initial chunk", chunkToInsert);
      const chunk = deserializeChunk(chunkToInsert);
      game.schedule_chunk_insert_wasm(chunk);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("Initial chunks loaded");

  game.update();
  canvasGameScript.update();

  console.log("Game Updated");

  console.log("Setting game entities");

  game.entities = entities;

  console.log("Game entities", game.entities.to_js());

  game.add_sandbox_wasm(sandbox);

  const gameLoop = async () => {
    const chunkToInsert = chunksToInsert.pop();
    if (chunkToInsert) {
      const chunk = deserializeChunk(chunkToInsert);
      game.schedule_chunk_insert_wasm(chunk);
    }

    game.update();
    playerController.update();
    canvasGameScript.update();
    hudRender.update(0);
    canvasGameScript.renderLoop(0);
  };

  setInterval(gameLoop, 1000 / 60);
}
