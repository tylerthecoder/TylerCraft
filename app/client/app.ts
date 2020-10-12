import { IGameMetadata } from "../src/game";
import { ClientDb } from "./worldModels/clientdb";
import { NetworkWorldModel } from "./worldModels/serverSaver";
import { ClientGame } from "./clientGame";
import { WorldModel } from "../src/worldModel";
import { SocketHandler } from "./socket";

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

  games.forEach(game => {
    ePickWorldScreen.innerHTML += `
      <button class="gameItem" id="game-${game.gameId}">
        ${game.name}
      </button>
    `;
    gamesMap.set(game.gameId, game);
  });

  ePickWorldScreen.innerHTML += `
    <button class="gameItem" id="game-new">
      New Game
    </button>
  `;

  const eGameItems = document.getElementsByClassName("gameItem");

  Array.from(eGameItems).forEach(ele => {
    ele.addEventListener("click", async () => {
      if (ele.id === "game-new") {
        const newWorld = await worldModel.createWorld();
        const game = new ClientGame(worldModel, newWorld.chunkReader, {multiplayer, activePlayers: []});
        game.gameId = newWorld.worldId;
        startGame(game);
        return;
      }

      const worldId = ele.id.substr(5);
      const serializedWorld = await worldModel.getWorld(worldId);
      console.log(serializedWorld);
      if (!serializedWorld) throw new Error("World wasn't found. Db must be effed up");
      const clientGame = new ClientGame(
        worldModel,
        serializedWorld.chunkReader,
        {data: serializedWorld.data, multiplayer, activePlayers: serializedWorld.activePlayers}
      );
      startGame(clientGame);
    });
  });
}

function startGame(game: ClientGame) {
  console.log("Starting game", game);
  (window as IExtendedWindow).game = game;
  ePickWorldScreen.classList.add("fade");
  eStartMenu.classList.add("fade")
}

