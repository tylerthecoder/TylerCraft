import { ISerializedGame } from "../src/game";
import { ClientDb } from "./clientdb";
import { ClientGame } from "./clientGame";

export const clientDb = new ClientDb();
(window as any).clientDb = clientDb;

const ePlayLocalButton = document.getElementById("playLocalButton")
const ePlayOnlineButton = document.getElementById("playOnlineButton")

const eStartMenu = document.getElementById("startMenu");
const eGameTypeScreen = document.getElementById("pickGameTypeScreen");
const ePickWorldScreen = document.getElementById("pickWorldScreen")

ePlayLocalButton.addEventListener("click", () => {
  eGameTypeScreen.classList.add("fade");
  showWorldPicker();
});

ePlayOnlineButton.addEventListener("click", () => {

});

async function showWorldPicker() {
  ePickWorldScreen.style.display = "block";
  eGameTypeScreen.style.display = "none";

  // get all the saved worlds
  const games = await clientDb.getSavedGames();

  const gamesMap = new Map<string, ISerializedGame>();

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
    ele.addEventListener("click", () => {
      if (ele.id === "game-new") {
        const game = new ClientGame();
        startGame(game);
        return;
      }

      const gameEle = ele.id.substr(5);
      const serializedGame = gamesMap.get(gameEle);
      const clientGame = new ClientGame(serializedGame);
      startGame(clientGame);
    });
  });
}

function startGame(game: ClientGame) {
  console.log("Starting game", game);
  (window as any).game = game;
  ePickWorldScreen.classList.add("fade");
  eStartMenu.classList.add("fade")
}

