import { ClientGame } from "../clientGame";
import { BLOCKS } from "../../src/blockdata";
import { canvas } from "../canvas";
import { MetaAction } from "../../src/entities/entity";
import { IDim } from "../../src/types";
import { MovableEntity } from "../../src/entities/moveableEntity";
import { CONFIG } from "../../src/config";
import { GameAction } from "@tylercraft/src/gameActions";
import { Direction } from "@tylercraft/src/utils/vector";
import { GameController } from "./controller";

export class MouseAndKeyController extends GameController {
  private keys = new Set();
  private keysPressed = new Set();
  private numOfUpdates = 0;

  private fullScreenButton = document.getElementById("fullScreenButton")!;
  private exitMenuButton = document.getElementById("exitMenuButton")!;
  private menuButton = document.getElementById("menuIcon")!;
  private gameMenu = document.getElementById("gameMenu")!;
  private eGameNameInput = document.getElementById("gameNameInput") as HTMLInputElement;
  private eSaveButton = document.getElementById("saveButton") as HTMLButtonElement;

  constructor(
    clientGame: ClientGame
  ) {
    super(clientGame);

    this.game = clientGame.game;


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
        this.clientGame.placeBlock();
      } else if (e.which === 1) { // left click
        this.clientGame.removeBlock();
      }
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (document.pointerLockElement === canvas.eCanvas) {
        const moveX = e.movementX * CONFIG.player.mouseRotSpeed;
        const moveY = e.movementY * CONFIG.player.mouseRotSpeed;

        this.clientGame.camera.rotateBy(moveX, moveY);

        // Send this data to the server
        this.game.handleAction(GameAction.PlayerRotate, {
          playerRot: this.clientGame.mainPlayer.rot.data as IDim,
          playerUid: this.clientGame.mainPlayer.uid,
        });
      }
    });

    window.addEventListener("wheel", (e: WheelEvent) => {
      if (e.deltaY > 0) {
        this.clientGame.selectedBlock = (this.clientGame.selectedBlock + 1) % this.clientGame.numOfBlocks;
      }

      if (e.deltaY < 0) {
        this.clientGame.selectedBlock = ((this.clientGame.selectedBlock - 1) + this.clientGame.numOfBlocks) % this.clientGame.numOfBlocks;
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
      this.openMenu();
    });

    this.exitMenuButton.addEventListener("click", () => {
      this.gameMenu.style.display = "none";
    });

    this.eGameNameInput.value = this.game.name;
    this.eGameNameInput.addEventListener("change", (e: KeyboardEvent) => {
      if (!e.target) return;
      // TODO debounce this
      this.game.handleAction(GameAction.ChangeName, {
        name: (e.target as HTMLInputElement).value
      });
    });

    this.eSaveButton.addEventListener("click", () => {
      this.game.handleAction(GameAction.Save, undefined);
    })
  }

  sendPos() {
    this.game.handleAction(GameAction.PlayerSetPos, {
      playerUid: this.clientGame.mainPlayer.uid,
      pos: this.clientGame.mainPlayer.pos.data as IDim,
    });
  }


  openMenu() {
    this.gameMenu.style.display = "block";
  }

  update(_delta: number) {
    if (this.clientGame.isSpectating) {
      const spectator = this.clientGame.spectator;
      this.ifHasKeyThenAddMeta(spectator, "w", MetaAction.forward);
      this.ifHasKeyThenAddMeta(spectator, "s", MetaAction.backward);
      this.ifHasKeyThenAddMeta(spectator, "d", MetaAction.right);
      this.ifHasKeyThenAddMeta(spectator, "a", MetaAction.left);
      this.ifHasKeyThenAddMeta(spectator, " ", MetaAction.up);
      this.ifHasKeyThenAddMeta(spectator, "shift", MetaAction.down);
    } else {
      const addMoveGameAction = (key: string, direction: Direction) => {
        console.log(this.keysPressed);
        if (this.keysPressed.has(key)) {
          console.log("Has it")
          this.game.handleAction(GameAction.PlayerMove, {
            direction,
            playerUid: this.clientGame.mainPlayer.uid,
            playerRot: this.clientGame.mainPlayer.rot.data as IDim,
          })
        }
      }
      const player = this.clientGame.mainPlayer;
      addMoveGameAction("w", Direction.Forwards);
      addMoveGameAction("s", Direction.Backwards);
      addMoveGameAction("d", Direction.Right);
      addMoveGameAction("a", Direction.Left);

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
      this.clientGame.toggleThirdPerson();
    })

    this.ifHasKeyThen("c", () => {
      this.clientGame.toggleCreative();
    })

    this.ifHasKeyThen("m", () => {
      this.openMenu();
    })

    this.ifHasKeyThen("p", () => {
      this.game.handleAction(GameAction.Save, undefined)
    })

    this.ifHasKeyThen("1", () => {
      this.clientGame.selectedBlock = BLOCKS.grass;
    })

    this.ifHasKeyThen("2", () => {
      this.clientGame.selectedBlock = BLOCKS.stone;
    })

    this.ifHasKeyThen("3", () => {
      this.clientGame.selectedBlock = BLOCKS.wood;
    })

    this.ifHasKeyThen("4", () => {
      this.clientGame.selectedBlock = BLOCKS.leaf;
    })

    this.ifHasKeyThen("5", () => {
      this.clientGame.selectedBlock = BLOCKS.cloud;
    })

    this.ifHasKeyThen("6", () => {
      this.clientGame.selectedBlock = BLOCKS.gold;
    })

    this.ifHasKeyThen("7", () => {
      this.clientGame.selectedBlock = BLOCKS.redFlower;
    })

    this.ifHasKeyThen("8", () => {
      this.clientGame.selectedBlock = BLOCKS.image;
    });

    this.ifHasKeyThen("9", () => {
      this.clientGame.selectedBlock = BLOCKS.image;
    });
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
