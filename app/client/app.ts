import { IGameMetadata } from "../src/game";
import { ClientDb } from "./worldModels/clientdb";
import { NetworkWorldModel } from "./worldModels/serverSaver";
import { ClientGame } from "./clientGame";
import { WorldModel } from "../src/worldModel";
import { SocketHandler } from "./socket";
import { CONFIG, setConfig } from "../src/config";
import { camelCaseToNormalCase } from "../src/utils";

interface IExtendedWindow extends Window {
  clientDb?: ClientDb;
  game?: ClientGame
}

export const IS_MOBILE = /Mobi/.test(window.navigator.userAgent);

console.log("Is Mobile: ", IS_MOBILE)


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

const ePlayLocalButton = document.getElementById("playLocalButton")!;
const ePlayOnlineButton = document.getElementById("playOnlineButton")!;

const eStartMenu = document.getElementById("startMenu")!;
const eGameTypeScreen = document.getElementById("pickGameTypeScreen")!;
const ePickWorldScreen = document.getElementById("pickWorldScreen")!;

ePlayLocalButton.addEventListener("click", async () => {
  eGameTypeScreen.classList.add("fade");
  const clientDb = new ClientDb();
  await clientDb.loadDb();
  (window as IExtendedWindow).clientDb = clientDb;
  showWorldPicker(clientDb, false);
});

export const SocketInterface = new SocketHandler();

ePlayOnlineButton.addEventListener("click", async () => {
  const serverWorldModel = new NetworkWorldModel();
  await SocketInterface.connect();
  showWorldPicker(serverWorldModel, true);
});

async function showWorldPicker(worldModel: WorldModel, multiplayer: boolean) {
  ePickWorldScreen.style.display = "block";
  eGameTypeScreen.style.display = "none";

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

  const eGameItems = document.getElementsByClassName("gameItem");

  Array.from(eGameItems).forEach(ele => {
    ele.addEventListener("click", async () => {
      if (ele.id === "game-new") {
        console.log("new World");
        showWorldOptionsScreen(worldModel, multiplayer);
        return;
      }

      const worldId = ele.id.substr(5);
      const serializedWorld = await worldModel.getWorld(worldId);
      if (!serializedWorld) throw new Error("World wasn't found. Db must be effed up");

      console.log(serializedWorld.data.config);

      setConfig({
        ...CONFIG,
        ...serializedWorld.data.config,
      });

      const clientGame = new ClientGame(
        worldModel,
        serializedWorld.chunkReader,
        { data: serializedWorld.data, multiplayer, activePlayers: serializedWorld.activePlayers }
      );
      startGame(clientGame);
    });
  });
}

const eWorldOptionsScreen = document.getElementById("worldOptionsScreen")!;
const eConfigForm = document.getElementById("configForm") as HTMLFormElement;
const eConfigFormExtra = document.getElementById("configFormExtra")!;
const eConfigFormStartButton = document.getElementById("configFormStartButton") as HTMLButtonElement;

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
        <input type="checkbox" checked=${configValue} name="${prefix + configKey}" />
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

function showWorldOptionsScreen(worldModel: WorldModel, multiplayer: boolean) {
  eWorldOptionsScreen.style.display = "flex"
  ePickWorldScreen.style.display = "none";

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

    const newWorld = await worldModel.createWorld();
    const game = new ClientGame(worldModel, newWorld.chunkReader, { multiplayer, activePlayers: [] });
    game.gameId = newWorld.worldId;
    game.name = formData.get("name") as string;

    startGame(game);
  });
}

function startGame(game: ClientGame) {
  console.log("Starting game", game);
  (window as IExtendedWindow).game = game;
  ePickWorldScreen.classList.add("fade");
  eStartMenu.classList.add("fade")
}
