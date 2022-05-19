import { GameAction } from "@tylercraft/src/gameActions";
import { MetaAction } from "../../src/entities/entity";
import { Vector2D } from "../../src/utils/vector";
import { ClientGame } from "../clientGame";
import { Controller, GameController } from "./controller";


interface IMobileState {
  pressing: {
    up: boolean,
  }
}

export class MobileController extends GameController {
  private state: IMobileState = {
    pressing: {
      up: false,
    }
  };

  private eForwardButton = document.getElementById("forwardButton")!;
  private eJumpButton = document.getElementById("jumpButton")!;
  private eToolbeltItems = Array.from(document.querySelectorAll(".toolbelt-item"));
  private eUseItemButton = document.getElementById("useItemButton")!;
  private eUseItemButton2 = document.getElementById("useItemButton2")!;


  constructor(
    public clientGame: ClientGame,
  ) {
    super(clientGame);

    let lastWindowTouch: Touch;
    const lastTouchStartPos = new Vector2D([0, 0]);
    window.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      lastWindowTouch = e.changedTouches.item(0)!;
      lastTouchStartPos.data = [lastWindowTouch.clientX, lastWindowTouch.clientY];
    }, { passive: false });

    window.addEventListener("touchmove", (e: TouchEvent) => {
      e.preventDefault();
      let touch: Touch | null = null;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const checkingTouch = e.changedTouches.item(i);
        if (checkingTouch?.identifier === lastWindowTouch.identifier) {
          touch = checkingTouch;
        }
      }
      if (!touch) return;

      const dx = (lastTouchStartPos.get(0) - touch.clientX) * .01;
      const dy = (lastTouchStartPos.get(1) - touch.clientY) * .01;

      lastTouchStartPos.data = [touch.clientX, touch.clientY];



      this.clientGame.camera.rotateBy(-dx, -dy);
    }, { passive: false })

    window.addEventListener("touchend", (e: TouchEvent) => {
      e.preventDefault();
    }, { passive: false });

    // handle jump button
    let jumpTouches: Touch[] = [];
    this.eJumpButton.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const touches = e.changedTouches;

      for (let i = 0; i < touches.length; i++) {
        jumpTouches.push(touches.item(i)!);
      }

      this.clientGame.mainPlayer.metaActions.add(MetaAction.jump);
    });

    this.eJumpButton.addEventListener("touchmove", (e: TouchEvent) => {
      const touches = e.changedTouches;
      let shouldJump = true;

      console.log("Moving", e);

      for (let i = 0; i < touches.length; i++) {
        const touch = touches.item(i);
        const [foundTouch] = jumpTouches.filter(t => t.identifier === touch?.identifier);
        if (foundTouch) {
          shouldJump = false;
        }

        jumpTouches.push(touches.item(i)!);
      }

      if (shouldJump) {
        this.clientGame.mainPlayer.metaActions.add(MetaAction.jump);
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
        jumpTouches = jumpTouches.filter(t => t.identifier === touch?.identifier);
      }

      // e.touches.
      this.clientGame.mainPlayer.metaActions.delete(MetaAction.jump);
    })

    // handle forward button
    let lastForwardTouch: Touch;
    this.eForwardButton.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      lastForwardTouch = e.changedTouches.item(0)!;
      this.clientGame.mainPlayer.metaActions.add(MetaAction.forward);
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
          this.clientGame.mainPlayer.metaActions.add(MetaAction.jump);
        } else {
          this.clientGame.mainPlayer.metaActions.delete(MetaAction.jump);
        }
      }
    });

    this.eForwardButton.addEventListener("touchend", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.clientGame.mainPlayer.metaActions.delete(MetaAction.forward);
      this.clientGame.mainPlayer.metaActions.delete(MetaAction.jump);
    });


    // item selection
    this.eToolbeltItems.forEach((item, index) => {
      item.addEventListener("touchstart", () => {
        this.clientGame.game.handleAction(GameAction.PlayerSetBeltIndex, {
          playerUid: this.clientGame.mainPlayer.uid,
          index,
        })
      });
    });


    this.eUseItemButton.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.clientGame.placeBlock();
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
      console.log("Removing")
      this.clientGame.removeBlock();
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

  update() {
    // NO-OP
  }
}