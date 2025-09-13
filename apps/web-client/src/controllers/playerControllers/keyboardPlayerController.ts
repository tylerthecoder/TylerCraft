import { CONFIG, PlayerController } from "@craft/engine";
import { Direction, EntityActionDto, Game } from "@craft/rust-world";
import { GameRenderer, PlayerPerspective } from "../../renders/game-renderer";

export class KeyboardPlayerEntityController extends PlayerController {
  cleanup(): void {
    throw new Error("Method not implemented.");
  }

  private keys = new Set();
  private keysPressed = new Set();
  private currentMoveDirection: Direction | "None" = "None";

  private hasJumped = false;

  constructor(
    game: Game,
    handleAction: (action: EntityActionDto) => void,
    private save: () => void,
    playerId: number,
    private gameRenderer: GameRenderer
  ) {
    super(game, handleAction, playerId);

    const webGlCanvas = document.getElementById("hud") as HTMLCanvasElement;

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

    webGlCanvas.addEventListener("mousemove", async (e: MouseEvent) => {
      // When you press esc, the pointer lock is released, but the mousemove event is still triggered. This is a hack to let the document.pointerLockElement be updated.
      await new Promise((resolve) => setTimeout(resolve, 0));

      if (document.pointerLockElement !== webGlCanvas) {
        return;
      }

      let moveX = e.movementX * CONFIG.player.mouseRotSpeed;
      const moveY = e.movementY * CONFIG.player.mouseRotSpeed;

      if (
        this.gameRenderer.perspective === PlayerPerspective.ThirdPersonFront
      ) {
        moveX += Math.PI;
        this.rotate(moveX, moveY);
      } else {
        this.rotate(moveX, moveY);
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
        this.currentMoveDirection = Direction.North;
        this.move(Direction.North);
        break;
      case "s":
        this.currentMoveDirection = Direction.South;
        this.move(Direction.South);
        break;
      case "a":
        this.currentMoveDirection = Direction.West;
        this.move(Direction.West);
        break;
      case "d":
        this.currentMoveDirection = Direction.East;
        this.move(Direction.East);
        break;
      case "e":
        this.currentMoveDirection = Direction.Up;
        this.move(Direction.Up);
        break;
      case "q":
        this.currentMoveDirection = Direction.Down;
        this.move(Direction.Down);
        break;
      case "c":
        this.toggleCreative();
        break;
      case "j":
        this.debugBlock();
        break;
      case "p":
        this.save();
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
      if (this.currentMoveDirection === Direction.North) {
        this.currentMoveDirection = "None";
        this.move("None");
      }
    } else if (key === "s") {
      if (this.currentMoveDirection === Direction.South) {
        this.currentMoveDirection = "None";
        this.move("None");
      }
    } else if (key === "a") {
      if (this.currentMoveDirection === Direction.West) {
        this.currentMoveDirection = "None";
        this.move("None");
      }
    } else if (key === "d") {
      if (this.currentMoveDirection === Direction.East) {
        this.currentMoveDirection = "None";
        this.move("None");
      }
    } else if (key === "e") {
      if (this.currentMoveDirection === Direction.Up) {
        this.currentMoveDirection = "None";
        this.move("None");
      }
    } else if (key === "q") {
      if (this.currentMoveDirection === Direction.Down) {
        this.currentMoveDirection = "None";
        this.move("None");
      }
    } else if (key === " ") {
      this.hasJumped = false;
    }
  }

  update() {
    // NO-OP
  }
}
