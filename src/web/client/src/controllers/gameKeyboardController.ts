import { MetaAction, MovableEntity, CONFIG, GameAction, Direction, GameController, IDim } from "@craft/engine";
import { ClientGame } from "../clientGame";
import { canvas } from "../canvas";

const makeWheelScroller = (game: ClientGame) => {
  let totalWheelDelta = 0;

  window.addEventListener("wheel", (e: WheelEvent) => {
    if (e.deltaY > 0) {
      // game.selectedBlock = (this.clientGame.selectedBlock + 1) % this.clientGame.numOfBlocks;

      if (totalWheelDelta < 0) {
        totalWheelDelta = 0;
      }
      totalWheelDelta += e.deltaY;
    }

    if (e.deltaY < 0) {
      // this.clientGame.selectedBlock = ((this.clientGame.selectedBlock - 1) + this.clientGame.numOfBlocks) % this.clientGame.numOfBlocks;
      if (totalWheelDelta > 0) {
        totalWheelDelta = 0;
      }
      totalWheelDelta += e.deltaY;
    }


    if (totalWheelDelta > 100) {
      totalWheelDelta = 0;
      game.handleAction(GameAction.PlayerBeltLeft, {
        playerUid: game.mainPlayer.uid,
      })
    }

    if (totalWheelDelta < -100) {
      totalWheelDelta = 0;
      game.handleAction(GameAction.PlayerBeltRight, {
        playerUid: game.mainPlayer.uid,
      })
    }
  })
}


export class MouseAndKeyController extends GameController<GameAction[]> {
  private keys = new Set();
  private keysPressed = new Set();
  private numOfUpdates = 0;

  private currentMoveDirections = new Set<Direction>();
  private prevMoveDirections = new Set<Direction>();

  private fullScreenButton = document.getElementById("fullScreenButton")!;
  private exitMenuButton = document.getElementById("exitMenuButton")!;
  private menuButton = document.getElementById("menuIcon")!;
  private gameMenu = document.getElementById("gameMenu")!;
  private eGameNameInput = document.getElementById("gameNameInput") as HTMLInputElement;
  private eSaveButton = document.getElementById("saveButton") as HTMLButtonElement;

  private hasMouseMoved = false;

  get player() {
    return this.clientGame.mainPlayer;
  }

  constructor(private clientGame: ClientGame) {
    super(clientGame);

    makeWheelScroller(clientGame);

    window.addEventListener("keydown", ({ key }) => {
      this.handleKeyDown(key)
    });

    window.addEventListener("keyup", ({ key }) => {
      this.handleKeyUp(key)
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
        this.placeBlock();
      } else if (e.which === 1) { // left click
        this.removeBlock();
      }
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (document.pointerLockElement === canvas.eCanvas) {
        const moveX = e.movementX * CONFIG.player.mouseRotSpeed;
        const moveY = e.movementY * CONFIG.player.mouseRotSpeed;

        this.clientGame.camera.rotateBy(moveX, moveY);

        this.hasMouseMoved = true;
      }
    });

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
    this.eGameNameInput.addEventListener("change", (e: Event) => {
      if (!e.target) return;
      // TODO debounce this
      this.game.handleAction(GameAction.ChangeName, {
        name: (e.target as HTMLInputElement).value
      });
    });

    this.eSaveButton.addEventListener("click", () => {
      this.save();
    })
  }

  save() {
    this.game.handleAction(GameAction.Save, undefined);
  }

  sendPos() {
    this.game.handleAction(GameAction.PlayerSetPos, {
      playerUid: this.clientGame.mainPlayer.uid,
      pos: this.clientGame.mainPlayer.pos.data as IDim,
    });
  }

  placeBlock() {
    this.game.handleAction(GameAction.PlaceBlock, {
      cameraData: this.clientGame.camera.getRay(),
      playerUid: this.clientGame.mainPlayer.uid,
    });
  }

  removeBlock() {
    this.game.handleAction(GameAction.RemoveBlock, {
      cameraData: this.clientGame.camera.getRay(),
      playerUid: this.clientGame.mainPlayer.uid,
    })
  }


  openMenu() {
    this.gameMenu.style.display = "block";
  }

  handleKeyDown(key: string) {
    this.keys.add(key.toLowerCase());
    if (key === "w") {
      this.currentMoveDirections.add(Direction.Forwards);
    } else if (key === "s") {
      this.currentMoveDirections.add(Direction.Backwards);
    } else if (key === "a") {
      this.currentMoveDirections.add(Direction.Left);
    } else if (key === "d") {
      this.currentMoveDirections.add(Direction.Right);
    } else if (key === "p") {
      this.game.handleAction(GameAction.Save, undefined)
    } else if (key === " ") {
      this.game.handleAction(GameAction.PlayerJump, {
        playerUid: this.player.uid,
      })
    }
  }

  handleKeyUp(key: string) {
    this.keys.delete(key.toLowerCase());
    this.keysPressed.add(key.toLowerCase());
    if (key === "w") {
      this.currentMoveDirections.delete(Direction.Forwards);
    } else if (key === "s") {
      this.currentMoveDirections.delete(Direction.Backwards);
    } else if (key === "a") {
      this.currentMoveDirections.delete(Direction.Left);
    } else if (key === "d") {
      this.currentMoveDirections.delete(Direction.Right);
    }
  }

  update(_delta: number) {

    if (this.hasMouseMoved) {
      // Send this data to the server
      this.game.handleAction(GameAction.PlayerRotate, {
        playerRot: this.clientGame.mainPlayer.rot.data as IDim,
        playerUid: this.clientGame.mainPlayer.uid,
      });
      this.hasMouseMoved = false;
    }



    if (this.clientGame.isSpectating) {
      // const spectator = this.clientGame.spectator;
      // this.ifHasKeyThenAddMeta(spectator, "w", MetaAction.forward);
      // this.ifHasKeyThenAddMeta(spectator, "s", MetaAction.backward);
      // this.ifHasKeyThenAddMeta(spectator, "d", MetaAction.right);
      // this.ifHasKeyThenAddMeta(spectator, "a", MetaAction.left);
      // this.ifHasKeyThenAddMeta(spectator, " ", MetaAction.up);
      // this.ifHasKeyThenAddMeta(spectator, "shift", MetaAction.down);
    } else {
      const player = this.clientGame.mainPlayer;

      // check if previous directions is different than current directions
      let areDifferent = false;
      for (const direction of this.currentMoveDirections) {
        if (!this.prevMoveDirections.has(direction)) {
          areDifferent = true;
          break;
        }
      }
      for (const direction of this.prevMoveDirections) {
        if (!this.currentMoveDirections.has(direction)) {
          areDifferent = true;
          break;
        }
      }

      if (areDifferent) {
        this.game.handleAction(GameAction.PlayerMove, {
          directions: Array.from(this.currentMoveDirections.values()),
          playerUid: this.clientGame.mainPlayer.uid,
          playerRot: this.clientGame.mainPlayer.rot.data as IDim,
        })

        // Copy prev to current
        this.prevMoveDirections = new Set(this.currentMoveDirections);
      }

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
      if (player.moveDirections.length > 0) {
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

    const selectBelt = (pos: number) => {
      this.game.handleAction(GameAction.PlayerSetBeltIndex, {
        playerUid: this.clientGame.mainPlayer.uid,
        index: pos,
      });

    }

    this.ifHasKeyThen("1", () => {
      selectBelt(0);
    })

    this.ifHasKeyThen("2", () => {
      selectBelt(1);
    })

    this.ifHasKeyThen("3", () => {
      selectBelt(2);
    })

    this.ifHasKeyThen("4", () => {
      selectBelt(3);
    })

    this.ifHasKeyThen("5", () => {
      selectBelt(4);
    })

    this.ifHasKeyThen("6", () => {
      selectBelt(5);
    })

    this.ifHasKeyThen("7", () => {
      selectBelt(6);
    })

    this.ifHasKeyThen("8", () => {
      selectBelt(7);
    });

    this.ifHasKeyThen("9", () => {
      selectBelt(8);
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
