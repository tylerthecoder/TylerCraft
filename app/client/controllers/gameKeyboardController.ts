import { Controller } from "./controller";
import { ClientGame } from "../clientGame";
import { BLOCKS } from "../../src/blockdata";
import { CanvasProgram } from "../canvas";
import { MetaAction } from "../../src/entities/entity";
import { IActionType, IDim } from "../../types";
import { MovableEntity } from "../../src/entities/moveableEntity";
import { CONFIG } from "../../src/config";

export class GameController extends Controller {
  private keys = new Set();
  private keysPressed = new Set();
  private numOfUpdates = 0;

  private fullScreenButton = document.getElementById("fullScreenButton")!;
  private exitMenuButton = document.getElementById("exitMenuButton")!;
  private menuButton = document.getElementById("menuIcon")!;
  private gameMenu = document.getElementById("gameMenu")!;
  private eGameNameInput = document.getElementById("gameNameInput") as HTMLInputElement;
  private eSaveButton = document.getElementById("saveButton") as HTMLButtonElement;

  constructor(public controlled: ClientGame, canvas: CanvasProgram) {
    super();

    window.addEventListener("keydown", ({ key }) => {
      this.keys.add(key.toLowerCase());
    });

    window.addEventListener("keyup", ({ key }) => {
      this.keys.delete(key.toLowerCase());
      this.keysPressed.add(key.toLowerCase());
    });

    window.addEventListener("mousedown", (e: MouseEvent) => {
      // make sure we are clicking the hud
      // I don't remember why I did this but it was causing problems
      // if (e.target !== canvas.eHud) {
      //   e.stopPropagation();
      //   console.log("Didn't hit HUD");
      //   return;
      // }

      if (document.pointerLockElement !== canvas.eCanvas) {
        canvas.eCanvas.requestPointerLock();
        return;
      }


      if (e.which === 3) { // right click
        this.controlled.placeBlock();
      } else if (e.which === 1) { // left click
        this.controlled.removeBlock();
      }
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (document.pointerLockElement === canvas.eCanvas) {
        const moveX = e.movementX * CONFIG.player.mouseRotSpeed;
        const moveY = e.movementY * CONFIG.player.mouseRotSpeed;

        this.controlled.camera.rotateBy(moveX, moveY);
      }
    });

    window.addEventListener("wheel", (e: WheelEvent) => {
      if (e.deltaY > 0) {
        this.controlled.selectedBlock = (this.controlled.selectedBlock + 1) % this.controlled.numOfBlocks;
      }

      if (e.deltaY < 0) {
        this.controlled.selectedBlock = ((this.controlled.selectedBlock - 1) + this.controlled.numOfBlocks) % this.controlled.numOfBlocks;
      }
    })

    this.fullScreenButton.addEventListener("click", () => {
      console.log("Toggling full screen");
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.body.requestFullscreen();
      }
    });

    this.menuButton.addEventListener("click", () => {
      this.gameMenu.style.display = "block";
    });

    this.exitMenuButton.addEventListener("click", () => {
      this.gameMenu.style.display = "none";
    });

    this.eGameNameInput.value = controlled.name;
    this.eGameNameInput.addEventListener("change", (e: KeyboardEvent) => {
      if (!e.target) return;
      controlled.name = (e.target as HTMLInputElement).value;
    });

    this.eSaveButton.addEventListener("click", () => {
      this.controlled.save();
    })
  }

  sendPos() {
    this.controlled.addAction({
      type: IActionType.playerSetPos,
      playerSetPos: {
        uid: this.controlled.mainPlayer.uid,
        pos: this.controlled.mainPlayer.pos.data as IDim,
      }
    });
  }

  update(_delta: number) {
    if (this.controlled.isSpectating) {
      const spectator = this.controlled.spectator;
      this.ifHasKeyThenAddMeta(spectator, "w", MetaAction.forward);
      this.ifHasKeyThenAddMeta(spectator, "s", MetaAction.backward);
      this.ifHasKeyThenAddMeta(spectator, "d", MetaAction.right);
      this.ifHasKeyThenAddMeta(spectator, "a", MetaAction.left);
      this.ifHasKeyThenAddMeta(spectator, " ", MetaAction.up);
      this.ifHasKeyThenAddMeta(spectator, "shift", MetaAction.down);
    } else {
      const player = this.controlled.mainPlayer;
      this.ifHasKeyThenAddMeta(player, "w", MetaAction.forward);
      this.ifHasKeyThenAddMeta(player, "s", MetaAction.backward);
      this.ifHasKeyThenAddMeta(player, "d", MetaAction.right);
      this.ifHasKeyThenAddMeta(player, "a", MetaAction.left);
      player.fire.holding = this.keys.has("f");

      if (this.keys.has("f")) {
        player.fireball();
      }


      if (player.creative) {
        this.ifHasKeyThenAddMeta(player, " ", MetaAction.up);
        this.ifHasKeyThenAddMeta(player, "shift", MetaAction.down);
      } else {
        this.ifHasKeyThenAddMeta(player, " ", MetaAction.jump);
      }

      // if there were any actions performed
      if (player.metaActions.size > 0) {
        this.numOfUpdates++;

        if (this.numOfUpdates > 10) {
          this.numOfUpdates = 0;
          this.sendPos();
        }
      }
    }

    this.ifHasKeyThen("v", () => {
      this.controlled.toggleThirdPerson();
    })

    this.ifHasKeyThen("c", () => {
      this.controlled.toggleCreative();
    })

    this.ifHasKeyThen("p", () => {
      this.controlled.save();
    })

    this.ifHasKeyThen("1", () => {
      this.controlled.selectedBlock = BLOCKS.grass;
    })

    this.ifHasKeyThen("2", () => {
      this.controlled.selectedBlock = BLOCKS.stone;
    })

    this.ifHasKeyThen("3", () => {
      this.controlled.selectedBlock = BLOCKS.wood;
    })

    this.ifHasKeyThen("4", () => {
      this.controlled.selectedBlock = BLOCKS.leaf;
    })

    this.ifHasKeyThen("5", () => {
      this.controlled.selectedBlock = BLOCKS.cloud;
    })

    this.ifHasKeyThen("6", () => {
      this.controlled.selectedBlock = BLOCKS.gold;
    })

    this.ifHasKeyThen("7", () => {
      this.controlled.selectedBlock = BLOCKS.redFlower;
    })
  }

  ifHasKeyThenAddMeta(ent: MovableEntity, key: string, metaAction: MetaAction) {
    if (this.keys.has(key))
      ent.metaActions.add(metaAction);
    else {
      ent.metaActions.delete(metaAction);
    }
  }

  ifHasKeyThen(key: string, func: () => void) {
    if (this.keysPressed.has(key)) {
      this.keysPressed.delete(key);
      func();
    }
  }
}
