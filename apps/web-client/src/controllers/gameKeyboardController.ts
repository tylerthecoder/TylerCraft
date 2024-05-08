import {
  Game,
  GameAction,
  GameActionType,
  GameController,
} from "@craft/engine";
import { ClientGame } from "../clientGame";

function getEleOrError(id: string): HTMLElement {
  const ele = document.getElementById(id);
  if (!ele) throw new Error(`Could not find element with id ${id}`);
  return ele;
}

export class MouseAndKeyboardGameController extends GameController {
  private keys = new Set();
  private keysPressed = new Set();

  private fullScreenButton = getEleOrError("fullScreenButton");
  private exitMenuButton = getEleOrError("exitMenuButton");
  private menuButton = getEleOrError("menuIcon");
  private gameMenu = getEleOrError("gameMenu");
  private eGameNameInput = getEleOrError("gameNameInput") as HTMLInputElement;
  private eSaveButton = getEleOrError("saveButton") as HTMLButtonElement;

  constructor(private clientGame: Game) {
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
      this.closeMenu();
    });

    this.eGameNameInput.value = this.clientGame.name;
    this.eGameNameInput.addEventListener("change", (e) => {
      if (!e.target) return;
      if (!(e.target instanceof HTMLInputElement)) return;
      // TODO debounce this
      this.changeName(e.target.value);
    });

    this.eSaveButton.addEventListener("click", () => {
      this.save();
    });

    window.addEventListener("keydown", (e) => {
      this.handleKeyDown(e.key);
    });

    window.addEventListener("keyup", (e) => {
      this.handleKeyUp(e.key);
    });
  }

  private save() {
    this.game.handleAction(GameAction.create(GameActionType.Save, undefined));
  }

  private changeName(name: string) {
    this.game.handleAction(
      GameAction.create(GameActionType.ChangeName, { name })
    );
  }

  private openMenu() {
    this.gameMenu.style.display = "block";
  }

  private closeMenu() {
    this.gameMenu.style.display = "none";
  }

  private handleKeyDown(key: string) {
    this.keys.add(key.toLowerCase());
    if (key === "p") {
      this.save();
    } else if (key === "v") {
      this.clientGame.toggleThirdPerson();
    } else if (key === "m") {
      this.openMenu();
    }
  }

  private handleKeyUp(key: string) {
    this.keys.delete(key.toLowerCase());
    this.keysPressed.add(key.toLowerCase());
  }

  update(_delta: number) {
    return false;
  }
}
