import { GameAction, GameActionType, GameController } from "@craft/engine";
import { ClientGame } from "../clientGame";

export class MouseAndKeyboardGameController extends GameController {
  private keys = new Set();
  private keysPressed = new Set();

  private fullScreenButton = document.getElementById("fullScreenButton")!;
  private exitMenuButton = document.getElementById("exitMenuButton")!;
  private menuButton = document.getElementById("menuIcon")!;
  private gameMenu = document.getElementById("gameMenu")!;
  private eGameNameInput = document.getElementById(
    "gameNameInput"
  ) as HTMLInputElement;
  private eSaveButton = document.getElementById(
    "saveButton"
  ) as HTMLButtonElement;

  get player() {
    return this.clientGame.mainPlayer;
  }

  constructor(private clientGame: ClientGame) {
    super(clientGame);

    this.fullScreenButton.addEventListener("click", () => {
      console.log("Toggling full screen");
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.body.requestFullscreen();
      }
    });

    this.menuButton.addEventListener("click", () => {
      this.openMenu();
    });

    this.exitMenuButton.addEventListener("click", () => {
      this.gameMenu.style.display = "none";
    });

    this.eGameNameInput.value = this.clientGame.name;
    this.eGameNameInput.addEventListener("change", (e: Event) => {
      if (!e.target) return;
      // TODO debounce this
      this.clientGame.handleAction(
        GameAction.create(GameActionType.ChangeName, {
          name: (e.target as HTMLInputElement).value,
        })
      );
    });

    this.eSaveButton.addEventListener("click", () => {
      this.save();
    });
  }

  save() {
    this.game.handleAction(GameActionType.Save, undefined);
  }

  openMenu() {
    this.gameMenu.style.display = "block";
  }

  handleKeyDown(key: string) {
    this.keys.add(key.toLowerCase());
    if (key === "p") {
      this.game.handleAction(GameActionType.Save, undefined);
    } else if (key === "v") {
      this.clientGame.toggleThirdPerson();
    } else if (key === "m") {
      this.openMenu();
    }
  }

  handleKeyUp(key: string) {
    this.keys.delete(key.toLowerCase());
    this.keysPressed.add(key.toLowerCase());
  }

  update(_delta: number) {
    return false;
  }
}
