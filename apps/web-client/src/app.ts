/** Entry point for the browser app
 * Controls string UI and creating the game
 */
import * as Engine from "@craft/engine";
console.log("Engine", Engine);
import {
  camelCaseToNormalCase,
  CONFIG,
  Game,
  IGameManager,
  IGameMetadata,
} from "@craft/engine";
import { NetworkGameManager } from "./worldModels/serverSaver";
import { ClientGame } from "./clientGame";
import { SocketHandler } from "./socket";
import { ClientDbGameManger } from "./worldModels/clientdb";
import { renderWorldPicker } from "./world-picker";
import { createRoot } from "react-dom/client";

export interface IExtendedWindow extends Window {
  clientDb?: ClientDbGameManger;
  game?: Game;
  clientGame?: ClientGame;
}

export const IS_MOBILE = /Mobi/.test(window.navigator.userAgent);
console.log("Is Mobile: ", IS_MOBILE);

// helper functions
function showElement(e: HTMLElement) {
  e.classList.remove("hidden");
  e.classList.add("shown");
}

function hideElement(e: HTMLElement) {
  e.classList.add("hidden");
  e.classList.remove("shown");
}

function getElementByIdOrThrow(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) {
    throw new Error(`Element with id ${id} not found`);
  }
  return e;
}

// generate your unique id
// kind of bad to do this client side, but I can make it better later
const UID_KEY = "tylercraft-uid";
if (!localStorage.getItem(UID_KEY)) {
  localStorage.setItem(UID_KEY, Math.random() + "");
}

export function getMyUid() {
  const uid = localStorage.getItem(UID_KEY);
  if (!uid) throw new Error("UID not defined");
  return uid;
}

// Get all of the elements
const ePlayLocalButton = getElementByIdOrThrow("playLocalButton");
const ePlayOnlineButton = getElementByIdOrThrow("playOnlineButton");
export const eStartMenu = getElementByIdOrThrow("startMenu");
const eGameTypeScreen = getElementByIdOrThrow("pickGameTypeScreen");
export const ePickWorldScreen = getElementByIdOrThrow("pickWorldScreen");
const eBackButton = getElementByIdOrThrow("backButton");
const eWorldOptionsScreen = getElementByIdOrThrow("worldOptionsScreen");
const eConfigForm = getElementByIdOrThrow("configForm") as HTMLFormElement;
const eConfigFormExtra = getElementByIdOrThrow("configFormExtra");
const eConfigFormStartButton = getElementByIdOrThrow(
  "configFormStartButton"
) as HTMLButtonElement;
const eLoadingScreen = getElementByIdOrThrow("loadingScreen");
const eLoadingScreenMsg = getElementByIdOrThrow("loadingScreenMsg");

const LoadingScreen = {
  show: (msg: string) => {
    showElement(eLoadingScreen);
    eLoadingScreenMsg.innerHTML = msg;
  },
  hide: () => {
    hideElement(eLoadingScreen);
  },
  fade: () => {
    eLoadingScreen.classList.add("fade");
  },
};

// Add listeners
ePlayLocalButton.addEventListener("click", showLocalWorldPicker);
ePlayOnlineButton.addEventListener("click", showOnlineWorldPicker);

export const SocketInterface = new SocketHandler();

// Screens:

// Start
// Choose Local World (#local)
// Create Local World (#local-new)
// Choose Server World (#server)
// Create Server World (#server-new)

// select certain screen based on the location hash
console.log("Location hash", location.hash);
if (location.hash === "#local") {
  showLocalWorldPicker();
} else if (location.hash === "#online") {
  showOnlineWorldPicker();
} else if (location.hash === "#online-new") {
  showOnlineNewWorldScreen();
} else if (location.hash === "#local-new") {
  showLocalNewWorldScreen();
}

export async function getLocalWorldModel() {
  const clientDb = await ClientDbGameManger.factory();
  (window as IExtendedWindow).clientDb = clientDb;
  return clientDb;
}

async function getOnlineWorldModel() {
  const serverWorldModel = new NetworkGameManager();
  await SocketInterface.connect(() => {
    console.error("Failed to connect to server");
  });
  return serverWorldModel;
}

// Auto load a world if a URL query is present
const idQuery = new URL(location.href).searchParams.get("worldId");

if (idQuery) {
  loadWorldById(idQuery);
}

export async function loadWorldById(gameId: string) {
  const findAndStartGame = async (
    gameId: string,
    gameManager: IGameManager
  ) => {
    const gameData = await gameManager.getGame(gameId);
    if (gameData) {
      await startGame(gameData);
      return true;
    }
    return false;
  };

  console.log("Loading game", gameId);

  const clientWorldModel = await getLocalWorldModel();
  if (await findAndStartGame(gameId, clientWorldModel)) {
    return;
  }
  const serverWorldModel = await getOnlineWorldModel();
  if (await findAndStartGame(gameId, serverWorldModel)) {
    return;
  }

  console.log("Id not found");

  // remove id from url
  const url = new URL(location.href);
  url.searchParams.delete("worldId");
  history.replaceState(null, "", url.href);
}

// Display Screen Functions
async function showLocalWorldPicker() {
  const clientDb = await getLocalWorldModel();
  showWorldPicker(clientDb, "local", "local-new", () => showLocalWorldPicker());
}

async function showOnlineWorldPicker() {
  const serverWorldModel = await getOnlineWorldModel();
  showWorldPicker(serverWorldModel, "online", "online-new", () =>
    showOnlineWorldPicker()
  );
}

async function showLocalNewWorldScreen() {
  hideElement(eGameTypeScreen);
  const clientDb = await getLocalWorldModel();
  showWorldOptionsScreen(clientDb, () => showLocalWorldPicker());
}

async function showOnlineNewWorldScreen() {
  hideElement(eGameTypeScreen);
  const clientDb = await getLocalWorldModel();
  showWorldOptionsScreen(clientDb, () => showOnlineWorldPicker());
}

async function showWorldPicker(
  gameManager: IGameManager,
  currentHash: string,
  nextHash: string,
  onBack: () => void
) {
  hideElement(eGameTypeScreen);
  hideElement(eWorldOptionsScreen);

  // get all the saved worlds
  const games = await gameManager.getAllGames();

  const onGameSelect = async (game: IGameMetadata) => {
    location.hash = nextHash;
    const gameData = await gameManager.getGame(game.gameId);
    if (!gameData) {
      throw new Error("World wasn't found. Db must be effed up");
    }

    await startGame(gameData);
  };

  const onNewGame = () => {
    console.log("Starting new game");
    showWorldOptionsScreen(gameManager, onBack);
  };

  const gamePickerHtml = renderWorldPicker({
    games,
    onGameSelect,
    onNewGame,
  });

  const root = createRoot(ePickWorldScreen);
  root.render(gamePickerHtml);

  // Display the games now that they are populated
  location.hash = currentHash;
  showElement(ePickWorldScreen);
  showElement(eBackButton);

  eBackButton.onclick = () => {
    location.hash = "";
    hideElement(ePickWorldScreen);
    hideElement(eBackButton);
    showElement(eGameTypeScreen);
  };
}

function createConfigHtmlObject(
  obj: Record<string, unknown>,
  prefix: string
): string {
  return Object.entries(obj).reduce(
    (acc, config) => acc + createConfigHtml(config, prefix),
    ""
  );
}

function createConfigHtml(
  [configKey, configValue]: [string, unknown],
  prefix: string
): string {
  const label =
    camelCaseToNormalCase(prefix.replace(/,/g, " ")) +
    camelCaseToNormalCase(configKey);
  switch (typeof configValue) {
    case "object":
      return createConfigHtmlObject(
        configValue as Record<string, unknown>,
        `${prefix + configKey + ","}`
      );
    case "boolean":
      return `
      <div class="form-row">
        <label> ${label}: </label>
        <input type="checkbox" ${configValue && "checked"} name="${
        prefix + configKey
      }" />
      </div>
    `;
    case "string":
      return `
      <div class="form-row">
        <label> ${label}: </label>
        <input type="text" value=${configValue} name="${prefix + configKey}" />
      </div>
    `;
    case "number":
      return `
      <div class="form-row">
        <label> ${label}: </label>
        <input type="number" value=${configValue} name="${
        prefix + configKey
      }" />
      </div>
    `;
  }
  return "";
}

function showWorldOptionsScreen(gameManager: IGameManager, onBack: () => void) {
  showElement(eWorldOptionsScreen);
  showElement(eBackButton);
  hideElement(ePickWorldScreen);
  eBackButton.onclick = onBack;

  // Goal:
  // Make a way to extract all of the properties from the CONFIG and make
  // an input for each one of them. When the input is changed,
  // a temp config variable is changed and then saved to the game

  eConfigFormExtra.innerHTML = createConfigHtmlObject(CONFIG, "");

  // When the game is started, update CONFIG with the the inputted values
  eConfigFormStartButton.addEventListener("click", async () => {
    const formData = new FormData(eConfigForm);

    const assignValueToConfig = (
      prefix: string,
      obj: Record<string, unknown>,
      configKey: string,
      configValue: unknown
    ) => {
      const newValue = formData.get(prefix + configKey);
      switch (typeof configValue) {
        case "number":
          obj[configKey] = Number(newValue);
          break;
        case "boolean":
          obj[configKey] = Boolean(newValue);
          break;
        case "string":
          obj[configKey] = newValue;
          break;
        case "object":
          assignValuesToConfigObject(
            prefix + configKey + ",",
            obj[configKey] as Record<string, unknown>
          );
          break;
      }
    };

    const assignValuesToConfigObject = (
      prefix: string,
      obj: Record<string, unknown>
    ) => {
      Object.entries(obj).forEach(([configKey, configValue]) =>
        assignValueToConfig(prefix, obj, configKey, configValue)
      );
    };

    assignValuesToConfigObject("", CONFIG);

    const name = formData.get("name") as string;

    await createGame(gameManager, CONFIG, name);
  });
}

async function createGame(
  gameManager: IGameManager,
  config: typeof CONFIG,
  name: string
) {
  hideElement(eWorldOptionsScreen);
  hideElement(eStartMenu);
  console.log("Creating Game | name=", name, "config=", config);
  LoadingScreen.show("Booting up");
  const gameData = await gameManager.createGame({
    config,
    name,
  });
  await startGame(gameData);
}

async function startGame(gameData: Engine.IGameData) {
  hideElement(eWorldOptionsScreen);
  hideElement(eStartMenu);
  console.log("Starting Game", gameData);
  LoadingScreen.show("Gathering Materials");
  await Engine.WorldModule.load();

  LoadingScreen.show("Painting the Sky");
  console.log("Loading game");
  const game = await ClientGame.make(gameData);
  console.log("Game Loaded, Starting game", game);

  (window as IExtendedWindow).game = game;
  history.pushState("Game", "", `?worldId=${game.gameId}`);

  LoadingScreen.show("Building Mountains");
  await game.baseLoad();
  console.log("Game Loaded");

  LoadingScreen.fade();
  ePickWorldScreen.classList.add("fade");
  eStartMenu.classList.add("fade");
}
