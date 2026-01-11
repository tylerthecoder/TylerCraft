import {
  IServerGameMetadata,
  ISocketMessageType,
  SocketMessage,
  WelcomeMessage,
} from "@craft/engine";
import { SocketHandler, SocketListener } from "./socket-service";
import { AppConfig } from "../appConfig";
import {
  ChunkFetcher,
  Entities,
  Entity,
  EntityActionDto,
  Game,
  SandBoxGScript,
  ServerChunkLoader,
} from "@craft/rust-world";
import { getMyUid } from "../utils";
import { GameRendererGameScript } from "../renders/game-renderer";
import {
  addGameRenderer,
  addHudRenderer,
  addPlayerController,
  loadInitialChunks,
  RunGameError,
  RunningGame,
} from "./running-game";

const log = (...message: any[]) => {
  console.log("mp-games-service.ts: ", ...message);
};

export const SocketInterface = new SocketHandler();

const baseUrl = AppConfig.api.baseUrl;

export async function getAllGames(): Promise<IServerGameMetadata[]> {
  const response = await fetch(`${baseUrl}/games`);
  return await response.json();
}

export async function create(name: string): Promise<string> {
  const response = await fetch(`${baseUrl}/game`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return await response.text();
}

export async function start(gameId: string): Promise<void> {
  await fetch(`${baseUrl}/game/${gameId}/start`, {
    method: "POST",
  });
}

export async function run(
  uiMessage: (message: string) => void,
  gameId: string
): Promise<RunningGame | RunGameError> {
  // ===== Join Game =====
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

  uiMessage("Connecting to game server...");

  await SocketInterface.connect(() => {
    console.error("Socket disconnected");
  });

  uiMessage("Starting game...");

  await start(gameId);

  uiMessage("Joining game...");

  const welcomeMessage = await joinGame(gameId);

  console.log("Joined game", welcomeMessage);

  // ===== Deserialize Game =====
  const entities = Entities.deserialize(welcomeMessage.entities);

  const game = Game.build(
    gameId,
    null,
    null,
    entities,
    null,
    ChunkFetcher.makeFromServerChunkLoader(
      new ServerChunkLoader(baseUrl, gameId)
    )
  );
  (window as any).game = game;

  // ===== Game Scripts =====
  game.ensureScript(GameRendererGameScript.name);
  game.ensureScript(SandBoxGScript.name());

  // ===== Main Player =====
  const myUid = getMyUid();
  console.log("My UID", myUid);

  // ===== Running Game =====
  const runningGame = new RunningGame(game, myUid);

  // ===== Load Initial Chunks =====
  await loadInitialChunks(runningGame, uiMessage);

  // ===== Game Renderer =====
  const gameRenderer = await addGameRenderer(runningGame, uiMessage);

  // ===== Add Action Listener =====
  const onAction = (action: EntityActionDto) => {
    SocketInterface.send(
      SocketMessage.make(ISocketMessageType.actions, action.to_js())
    );
  };
  runningGame.onActionListeners.addListener(onAction, "onAction");

  // ===== Add Socket Listener =====
  SocketInterface.addListener((message) => {
    console.log("Got actions message from server", message);
    if (message.isType(ISocketMessageType.actions)) {
      const action = message.data;
      const actionDto = EntityActionDto.from_js(action);
      game.handleAction(actionDto);
    }
    if (message.isType(ISocketMessageType.newPlayer)) {
      const player = message.data;
      game.addEntity(Entity.from_js(player));
    }
  });

  // ===== Add Player Controller =====
  addPlayerController(runningGame, gameRenderer);

  // ===== Hud Renderer =====
  addHudRenderer(runningGame, gameRenderer);

  // ===== Start Game =====
  runningGame.start();

  return runningGame;
}
