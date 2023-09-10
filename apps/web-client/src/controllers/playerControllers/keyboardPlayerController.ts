import {
  CONFIG,
  Direction,
  EntityController,
  IDim,
  Player,
  PlayerAction,
  PlayerActionType,
  handlePlayerAction,
} from "@craft/engine";
import { canvas } from "../../canvas";
import { ClientGame } from "../../clientGame";

export class KeyboardPlayerEntityController extends EntityController {
  cleanup(): void {
    throw new Error("Method not implemented.");
  }

  private keys = new Set();
  private keysPressed = new Set();
  private hasMouseMoved = false;
  private currentMoveDirections = new Set<Direction>();
  private prevMoveDirections = new Set<Direction>();

  private numOfUpdates = 0;

  constructor(
    private actionListener: (action: PlayerAction) => void,
    private player: Player,
    private clientGame: ClientGame
  ) {
    super();
    window.addEventListener("mousedown", (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas.eCanvas) {
        canvas.eCanvas.requestPointerLock();
        return;
      }

      if (e.which === 3) {
        // right click
        this.placeBlock();
      } else if (e.which === 1) {
        // left click
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

    let totalWheelDelta = 0;

    window.addEventListener("wheel", (e: WheelEvent) => {
      if (e.deltaY > 0) {
        if (totalWheelDelta < 0) {
          totalWheelDelta = 0;
        }
        totalWheelDelta += e.deltaY;
      }

      if (e.deltaY < 0) {
        if (totalWheelDelta > 0) {
          totalWheelDelta = 0;
        }
        totalWheelDelta += e.deltaY;
      }

      if (totalWheelDelta > 100) {
        totalWheelDelta = 0;
        this.handleAction(
          PlayerAction.make(PlayerActionType.BeltLeft, {
            playerUid: this.player.uid,
          })
        );
      }

      if (totalWheelDelta < -100) {
        totalWheelDelta = 0;
        this.handleAction(
          PlayerAction.make(PlayerActionType.BeltRight, {
            playerUid: this.player.uid,
          })
        );
      }
    });

    window.addEventListener("keydown", ({ key }) => {
      this.handleKeyDown(key);
    });

    window.addEventListener("keyup", ({ key }) => {
      this.handleKeyUp(key);
    });
  }

  handleKeyDown(key: string) {
    this.keys.add(key.toLowerCase());
    switch (key) {
      case "w":
        this.currentMoveDirections.add(Direction.Forwards);
        break;
      case "s":
        this.currentMoveDirections.add(Direction.Backwards);
        break;
      case "a":
        this.currentMoveDirections.add(Direction.Left);
        break;
      case "d":
        this.currentMoveDirections.add(Direction.Right);
        break;
      case "c":
        this.player.creative = true;
        break;
      case "j":
        this.handleAction(
          PlayerAction.make(PlayerActionType.PlaceDebugBlock, {
            playerUid: this.player.uid,
          })
        );
        break;
      case " ":
        this.handleAction(
          PlayerAction.make(PlayerActionType.Jump, {
            playerUid: this.player.uid,
          })
        );
        break;
      case "1":
        this.selectBelt(0);
        break;
      case "2":
        this.selectBelt(1);
        break;
      case "3":
        this.selectBelt(2);
        break;
      case "4":
        this.selectBelt(3);
        break;
      case "5":
        this.selectBelt(4);
        break;
      case "6":
        this.selectBelt(5);
        break;
      case "7":
        this.selectBelt(6);
        break;
      case "8":
        this.selectBelt(7);
        break;
      case "9":
        this.selectBelt(8);
        break;
      case "0":
        this.selectBelt(9);
        break;
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

  update() {
    if (this.hasMouseMoved) {
      this.handleAction(
        PlayerAction.make(PlayerActionType.Rotate, {
          playerRot: this.clientGame.mainPlayer.rot.data as IDim,
          playerUid: this.clientGame.mainPlayer.uid,
        })
      );
      this.hasMouseMoved = false;
    }

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
      this.handleAction(
        PlayerAction.make(PlayerActionType.Move, {
          directions: Array.from(this.currentMoveDirections.values()),
          playerUid: this.clientGame.mainPlayer.uid,
          playerRot: this.clientGame.mainPlayer.rot.data as IDim,
        })
      );

      // Copy prev to current
      this.prevMoveDirections = new Set(this.currentMoveDirections);
    }

    // if there were any actions performed
    if (this.player.moveDirections.length > 0) {
      this.numOfUpdates++;

      if (this.numOfUpdates > 10) {
        this.numOfUpdates = 0;
        this.sendPos();
      }
    }
  }

  handleAction(action: PlayerAction) {
    console.log("Keyboard controller hanling action", action);
    handlePlayerAction(this.clientGame, this.player, action);
    this.actionListener(action);
  }

  sendPos() {
    this.handleAction(
      PlayerAction.make(PlayerActionType.SetPos, {
        playerUid: this.clientGame.mainPlayer.uid,
        pos: this.clientGame.mainPlayer.pos.data as IDim,
      })
    );
  }

  placeBlock() {
    this.handleAction(
      PlayerAction.make(PlayerActionType.PlaceBlock, {
        cameraData: this.clientGame.camera.getRay(),
        playerUid: this.player.uid,
      })
    );
  }

  removeBlock() {
    this.handleAction(
      PlayerAction.make(PlayerActionType.RemoveBlock, {
        cameraData: this.clientGame.camera.getRay(),
        playerUid: this.player.uid,
      })
    );
  }

  selectBelt(pos: number) {
    this.handleAction(
      PlayerAction.make(PlayerActionType.SetBeltIndex, {
        playerUid: this.player.uid,
        index: pos,
      })
    );
  }
}
