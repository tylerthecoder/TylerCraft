import {
  MetaAction,
  Vector2D,
  EntityController,
  Player,
  PlayerAction,
  PlayerActionType,
  Game,
} from "@craft/engine";
import { CanvasGameScript } from "../../game-scripts/canvas-gscript";

export class MobileController extends EntityController {
  private eForwardButton = document.getElementById("forwardButton")!;
  private eJumpButton = document.getElementById("jumpButton")!;
  private eToolbeltItems = Array.from(
    document.querySelectorAll(".toolbelt-item")
  );
  private eUseItemButton = document.getElementById("useItemButton")!;
  private eUseItemButton2 = document.getElementById("useItemButton2")!;

  constructor(
    private game: Game,
    private player: Player,
    private sendAction: (action: PlayerAction) => void
  ) {
    super();
    const canvasGScript = this.game.getGameScript(CanvasGameScript);

    let lastWindowTouch: Touch;
    const lastTouchStartPos = new Vector2D([0, 0]);
    window.addEventListener(
      "touchstart",
      (e: TouchEvent) => {
        e.preventDefault();
        lastWindowTouch = e.changedTouches.item(0)!;
        lastTouchStartPos.data = [
          lastWindowTouch.clientX,
          lastWindowTouch.clientY,
        ];
      },
      { passive: false }
    );

    window.addEventListener(
      "touchmove",
      (e: TouchEvent) => {
        e.preventDefault();
        let touch: Touch | null = null;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const checkingTouch = e.changedTouches.item(i);
          if (checkingTouch?.identifier === lastWindowTouch.identifier) {
            touch = checkingTouch;
          }
        }
        if (!touch) return;

        const dx = (lastTouchStartPos.get(0) - touch.clientX) * 0.01;
        const dy = (lastTouchStartPos.get(1) - touch.clientY) * 0.01;

        lastTouchStartPos.data = [touch.clientX, touch.clientY];

        canvasGScript.camera.rotateBy(-dx, -dy);
      },
      { passive: false }
    );

    window.addEventListener(
      "touchend",
      (e: TouchEvent) => {
        e.preventDefault();
      },
      { passive: false }
    );

    // handle jump button
    let jumpTouches: Touch[] = [];
    this.eJumpButton.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const touches = e.changedTouches;

      for (let i = 0; i < touches.length; i++) {
        jumpTouches.push(touches.item(i)!);
      }

      this.player.metaActions.add(MetaAction.jump);
    });

    this.eJumpButton.addEventListener("touchmove", (e: TouchEvent) => {
      const touches = e.changedTouches;
      let shouldJump = true;

      console.log("Moving", e);

      for (let i = 0; i < touches.length; i++) {
        const touch = touches.item(i);
        const [foundTouch] = jumpTouches.filter(
          (t) => t.identifier === touch?.identifier
        );
        if (foundTouch) {
          shouldJump = false;
        }

        jumpTouches.push(touches.item(i)!);
      }

      if (shouldJump) {
        this.player.metaActions.add(MetaAction.jump);
      }

      e.preventDefault();
      e.stopPropagation();
    });

    this.eJumpButton.addEventListener("touchend", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        const touch = touches.item(i);
        jumpTouches = jumpTouches.filter(
          (t) => t.identifier === touch?.identifier
        );
      }

      // e.touches.
      this.player.metaActions.delete(MetaAction.jump);
    });

    // handle forward button
    let lastForwardTouch: Touch;
    this.eForwardButton.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      lastForwardTouch = e.changedTouches.item(0)!;
      this.player.metaActions.add(MetaAction.forward);
    });

    this.eForwardButton.addEventListener("touchmove", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // see if the user swiped upwards, meaning they want to jump
      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        const touch = touches.item(i)!;
        const diffY = lastForwardTouch.clientY - touch.clientY;

        if (diffY > 50) {
          this.player.metaActions.add(MetaAction.jump);
        } else {
          this.player.metaActions.delete(MetaAction.jump);
        }
      }
    });

    this.eForwardButton.addEventListener("touchend", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.player.metaActions.delete(MetaAction.forward);
      this.player.metaActions.delete(MetaAction.jump);
    });

    // item selection
    this.eToolbeltItems.forEach((item, index) => {
      item.addEventListener("touchstart", () => {
        this.handleAction(
          PlayerAction.make(PlayerActionType.SetBeltIndex, {
            playerUid: this.player.uid,
            index,
          })
        );
      });
    });

    this.eUseItemButton.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      this.handleAction(
        PlayerAction.make(PlayerActionType.PlaceBlock, {
          playerUid: this.player.uid,
          cameraData: canvasGScript.camera.getRay(),
        })
      );
    });

    this.eUseItemButton.addEventListener("touchmove", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    });

    this.eUseItemButton.addEventListener("touchend", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    });

    this.eUseItemButton2.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Removing");
      this.handleAction(
        PlayerAction.make(PlayerActionType.RemoveBlock, {
          playerUid: this.player.uid,
          cameraData: canvasGScript.camera.getRay(),
        })
      );
    });

    this.eUseItemButton2.addEventListener("touchmove", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    });

    this.eUseItemButton2.addEventListener("touchend", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  handleAction(action: PlayerAction) {
    console.log("Mobile controller hanling action", action);
    this.sendAction(action);
  }

  update() {
    // NO-OP
  }

  cleanup(): void {
    throw new Error("Method not implemented.");
  }
}
