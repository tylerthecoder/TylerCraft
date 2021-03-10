import { IGameMetadata } from "../src/game";
import { ClientDb } from "./worldModels/clientdb";
import { NetworkWorldModel } from "./worldModels/serverSaver";
import { ClientGame } from "./clientGame";
import { SocketHandler } from "./socket";
import { CONFIG, setConfig } from "../src/config";
import { camelCaseToNormalCase } from "../src/utils";
import { WorldModel } from "../src/types";

interface IExtendedWindow extends Window {
  clientDb?: ClientDb;
  game?: ClientGame
}

export const IS_MOBILE = /Mobi/.test(window.navigator.userAgent);

console.log("Is Mobile: ", IS_MOBILE)

// helper functions
function showElement(e: HTMLElement) {
  e.classList.remove("hidden");
  e.classList.add("shown");
}

function hideElement(e: HTMLElement) {
  e.classList.add("hidden");
  e.classList.remove("shown");
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
const ePlayLocalButton = document.getElementById("playLocalButton")!;
const ePlayOnlineButton = document.getElementById("playOnlineButton")!;
const eStartMenu = document.getElementById("startMenu")!;
const eGameTypeScreen = document.getElementById("pickGameTypeScreen")!;
const ePickWorldScreen = document.getElementById("pickWorldScreen")!;
const eBackButton = document.getElementById("backButton")!;
const eWorldOptionsScreen = document.getElementById("worldOptionsScreen")!;
const eConfigForm = document.getElementById("configForm") as HTMLFormElement;
const eConfigFormExtra = document.getElementById("configFormExtra")!;
const eConfigFormStartButton = document.getElementById("configFormStartButton") as HTMLButtonElement;

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

async function getLocalWorldModel() {
  const clientDb = new ClientDb();
  await clientDb.loadDb();
  (window as IExtendedWindow).clientDb = clientDb;
  return clientDb;
}

async function getOnlineWorldModel() {
  const serverWorldModel = new NetworkWorldModel();
  await SocketInterface.connect();
  return serverWorldModel;
}


// Display Screen Functions
async function showLocalWorldPicker() {
  const clientDb = await getLocalWorldModel();
  showWorldPicker(clientDb, "local", "local-new", () => showLocalWorldPicker());
}

async function showOnlineWorldPicker() {
  const serverWorldModel = await getOnlineWorldModel();
  showWorldPicker(serverWorldModel, "online", "online-new", () => showOnlineWorldPicker());
}

async function showLocalNewWorldScreen() {
  hideElement(eGameTypeScreen);
  const clientDb = await getLocalWorldModel();
  showWorldOptionsScreen(clientDb, () => showLocalWorldPicker())
}

async function showOnlineNewWorldScreen() {
  hideElement(eGameTypeScreen);
  const clientDb = await getLocalWorldModel();
  showWorldOptionsScreen(clientDb, () => showOnlineWorldPicker())
}


async function showWorldPicker(worldModel: WorldModel, currentHash: string, nextHash: string, onBack: () => void) {
  hideElement(eGameTypeScreen);
  hideElement(eWorldOptionsScreen);

  // show a loading spinner here

  // get all the saved worlds
  const games = await worldModel.getAllWorlds();
  const gamesMap = new Map<string, IGameMetadata>();

  console.log(games, gamesMap);

  games.forEach(game => gamesMap.set(game.gameId, game));

  let gamesHtml = games.reduce((acc, game) => `
    ${acc}
    <button class="gameItem" id="game-${game.gameId}">
      ${game.name}
    </button>
  `, "");

  gamesHtml += `
    <button class="gameItem" id="game-new">
      New Game
    </button>
  `;

  ePickWorldScreen.innerHTML = gamesHtml;

  // Display the games now that they are populated
  location.hash = currentHash;
  showElement(ePickWorldScreen);
  showElement(eBackButton);
  eBackButton.onclick = () => {
    location.hash = "";
    hideElement(ePickWorldScreen);
    hideElement(eBackButton);
    showElement(eGameTypeScreen);
  }

  const eGameItems = document.getElementsByClassName("gameItem");

  Array.from(eGameItems).forEach(ele => {
    // you clicked a world
    ele.addEventListener("click", async () => {
      location.hash = nextHash;

      if (ele.id === "game-new") {
        console.log("new World");
        showWorldOptionsScreen(worldModel, onBack);
        return;
      }

      const worldId = ele.id.substr(5);
      const worldData = await worldModel.getWorld(worldId);
      if (!worldData) throw new Error("World wasn't found. Db must be effed up");

      const clientGame = new ClientGame(
        worldModel,
        worldData,
      );

      startGame(clientGame);
    });
  });
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
  prefix: string,
): string {
  const label =
    camelCaseToNormalCase(prefix.replace(/,/g, " ")) +
    camelCaseToNormalCase(configKey);
  switch (typeof configValue) {
    case "object":
      return createConfigHtmlObject(configValue as Record<string, unknown>, `${prefix + configKey + ","}`);
    case "boolean":
      return `
      <div class="form-row">
        <label> ${label}: </label>
        <input type="checkbox" ${configValue && "checked"} name="${prefix + configKey}" />
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
        <input type="number" value=${configValue} name="${prefix + configKey}" />
      </div>
    `;
  }
  return "";
}

function showWorldOptionsScreen(worldModel: WorldModel, onBack: () => void) {
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

    const assignValueToConfig = (prefix: string, obj: Record<string, unknown>, configKey: string, configValue: unknown) => {
      const newValue = formData.get(prefix + configKey);
      switch (typeof configValue) {
        case "number":
          console.log(prefix, configKey, configValue, newValue);
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
    }

    const assignValuesToConfigObject = (prefix: string, obj: Record<string, unknown>) => {
      Object.
        entries(obj).
        forEach(
          ([configKey, configValue]) => assignValueToConfig(prefix, obj, configKey, configValue)
        );
    }

    assignValuesToConfigObject("", CONFIG);

    const newWorldData = await worldModel.createWorld({
      config: CONFIG,
      gameName: formData.get("name") as string,
    });

    const game = new ClientGame(
      worldModel,
      newWorldData,
    );

    startGame(game);
  });
}

function startGame(game: ClientGame) {
  console.log("Starting game", game);
  (window as IExtendedWindow).game = game;
  ePickWorldScreen.classList.add("fade");
  eStartMenu.classList.add("fade");
}
