import {
  CONFIG,
  Direction,
  Game,
  IDim,
  Player,
  PlayerAction,
  PlayerActionService,
  PlayerActionType,
  PlayerController,
} from "@craft/engine";
import { CanvasGameScript } from "../../game-scripts/canvas-gscript";
import { WebGlGScript } from "../../game-scripts/webgl-gscript";
import { HudGScript } from "../../game-scripts/hudRender";

export class KeyboardPlayerEntityController extends PlayerController {
  cleanup(): void {
    throw new Error("Method not implemented.");
  }

  private keys = new Set();
  private keysPressed = new Set();
  private hasMouseMoved = false;
  private currentMoveDirections = new Set<Direction>();
  private prevMoveDirections = new Set<Direction>();

  private numOfUpdates = 0;

  private hasJumped = false;

  constructor(
    playerActionService: PlayerActionService,
    game: Game,
    player: Player
  ) {
    super(playerActionService, game, player);

    const hudEle = game.getGameScript(HudGScript).eHud;
    const webGlCanvas = game.getGameScript(WebGlGScript).eCanvas;

    // Pointer lock to the canvas
    hudEle.addEventListener("mousedown", (e: MouseEvent) => {
      if (e.target !== hudEle) {
        return;
      }

      if (document.pointerLockElement !== webGlCanvas) {
        webGlCanvas.requestPointerLock();
      }
    });

    window.addEventListener("mousedown", (e: MouseEvent) => {
      if (document.pointerLockElement !== webGlCanvas) {
        return;
      }

      if (e.button === 2) {
        // right click
        this.primaryAction();
      } else if (e.button === 0) {
        // left click
        this.secondaryAction();
      }
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (document.pointerLockElement === webGlCanvas) {
        const moveX = e.movementX * CONFIG.player.mouseRotSpeed;
        const moveY = e.movementY * CONFIG.player.mouseRotSpeed;

        const canvas = this.game.getGameScript(CanvasGameScript);
        canvas.camera.rotateBy(moveX, moveY);

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
          PlayerAction.make(PlayerActionType.BeltRight, {
            playerUid: this.player.uid,
          })
        );
      }

      if (totalWheelDelta < -100) {
        totalWheelDelta = 0;
        this.handleAction(
          PlayerAction.make(PlayerActionType.BeltLeft, {
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
      case "e":
        this.currentMoveDirections.add(Direction.Up);
        break;
      case "q":
        this.currentMoveDirections.add(Direction.Down);
        break;
      case "c":
        this.toggleCreative();
        break;
      case "j":
        this.handleAction(
          PlayerAction.make(PlayerActionType.PlaceDebugBlock, {
            playerUid: this.player.uid,
          })
        );
        break;
      case " ":
        if (this.hasJumped) {
          break;
        }
        this.hasJumped = true;
        this.jump();
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
    } else if (key === "e") {
      this.currentMoveDirections.delete(Direction.Up);
    } else if (key === "q") {
      this.currentMoveDirections.delete(Direction.Down);
    } else if (key === " ") {
      this.hasJumped = false;
    }
  }

  update() {
    if (this.hasMouseMoved) {
      this.handleAction(
        PlayerAction.make(PlayerActionType.Rotate, {
          playerRot: this.player.rot.data as IDim,
          playerUid: this.player.uid,
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
      this.move(Array.from(this.currentMoveDirections.values()));

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
    // console.log("Keyboard controller hanling action", action, this.id);
    this.playerActionService.performAction(action);
  }

  sendPos() {
    this.handleAction(
      PlayerAction.make(PlayerActionType.SetPos, {
        playerUid: this.player.uid,
        pos: this.player.pos.data as IDim,
      })
    );
  }
}
