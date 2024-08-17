import {
  CONFIG,
  PlayerActionService,
  PlayerController,
  GameWrapper,
} from "@craft/engine";
import { WebGlGScript } from "../../game-scripts/webgl-gscript";
import { Direction } from "@craft/rust-world";
import {
  CanvasGameScript,
  PlayerPerspective,
} from "../../game-scripts/canvas-gscript";

export class KeyboardPlayerEntityController extends PlayerController {
  cleanup(): void {
    throw new Error("Method not implemented.");
  }

  private keys = new Set();
  private keysPressed = new Set();
  private currentMoveDirections = new Set<Direction>();
  private prevMoveDirections = new Set<Direction>();

  private numOfUpdates = 0;

  private hasJumped = false;

  constructor(
    playerActionService: PlayerActionService,
    game: GameWrapper,
    playerId: number,
    private canvasGScript: CanvasGameScript,
    webGlGScript: WebGlGScript
  ) {
    super(playerActionService, game, playerId);

    const webGlCanvas = webGlGScript.eCanvas;

    // Pointer lock to the canvas
    webGlCanvas.addEventListener("mousedown", (e: MouseEvent) => {
      if (e.target !== webGlCanvas) {
        return;
      }
      if (document.pointerLockElement !== webGlCanvas) {
        webGlCanvas.requestPointerLock();
      }
    });

    webGlCanvas.addEventListener("mousedown", (e: MouseEvent) => {
      if (document.pointerLockElement !== webGlCanvas) {
        return;
      }

      if (e.button === 2) {
        this.primaryAction();
      } else if (e.button === 0) {
        this.secondaryAction();
      }
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (document.pointerLockElement === webGlCanvas) {
        let moveX = e.movementX * CONFIG.player.mouseRotSpeed;
        const moveY = e.movementY * CONFIG.player.mouseRotSpeed;

        if (
          this.canvasGScript.perspective === PlayerPerspective.ThirdPersonFront
        ) {
          moveX += Math.PI;
          this.rotate(moveX, moveY);
        } else {
          this.rotate(moveX, moveY);
        }
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
        this.beltRight();
      }

      if (totalWheelDelta < -100) {
        totalWheelDelta = 0;
        this.beltLeft();
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
        this.currentMoveDirections.add(Direction.North);
        break;
      case "s":
        this.currentMoveDirections.add(Direction.South);
        break;
      case "a":
        this.currentMoveDirections.add(Direction.West);
        break;
      case "d":
        this.currentMoveDirections.add(Direction.East);
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
        this.debugBlock();
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
      this.currentMoveDirections.delete(Direction.North);
    } else if (key === "s") {
      this.currentMoveDirections.delete(Direction.South);
    } else if (key === "a") {
      this.currentMoveDirections.delete(Direction.West);
    } else if (key === "d") {
      this.currentMoveDirections.delete(Direction.East);
    } else if (key === "e") {
      this.currentMoveDirections.delete(Direction.Up);
    } else if (key === "q") {
      this.currentMoveDirections.delete(Direction.Down);
    } else if (key === " ") {
      this.hasJumped = false;
    }
  }

  update() {
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
  }
}
