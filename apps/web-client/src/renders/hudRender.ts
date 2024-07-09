import { Renderer } from "./renderer";
import { Camera, Game } from "@craft/engine";
import { CanvasProgram } from "../canvas";
import TextureMapper from "../textureMapper";
import { IS_MOBILE } from "../app";
import { CanvasGameScript } from "../game-scripts/canvas-gscript";
import { BasicUsecase } from "../usecases/sandbox";

function hide(e: HTMLElement) {
  e.style.display = "none";
}
export class HudRenderer extends Renderer {
  textureImg: HTMLImageElement;

  private eToolbelt = document.getElementById("toolbelt") as HTMLDivElement;
  private eHealthBar = document.getElementById("healthBar") as HTMLDivElement;
  private eToolbeltItems = Array.from(
    document.querySelectorAll(".toolbelt-item")
  ) as HTMLElement[];
  private eStats = document.getElementById("eStats") as HTMLDivElement;
  private eUseItemButton = document.getElementById("useItemButton")!;
  private eUseItemButton2 = document.getElementById("useItemButton2")!;
  private eForwardButton = document.getElementById("forwardButton")!;
  private eJumpButton = document.getElementById("jumpButton")!;

  constructor(private game: Game, public canvas: CanvasProgram) {
    super();
    this.textureImg = document.createElement("img");
    this.textureImg.src = "./img/texture_map.png";
    document.body.appendChild(this.textureImg);

    const hudElement = document.getElementById("hud")!;
    hudElement.style.visibility = "visible";

    if (!IS_MOBILE) {
      this.hideControls();
    }

    this.textureImg.onload = () => {
      this.drawBelt();
    };
  }

  private getScreenDim(): [sw: number, sh: number] {
    return [window.innerWidth, window.innerHeight];
  }

  clearScreen() {
    const [sw, sh] = this.getScreenDim();
    this.canvas.hudCxt.clearRect(0, 0, sw, sh);
  }

  drawRect(x: number, y: number, w: number, h: number) {
    this.canvas.hudCxt.fillRect(x, y, w, h);
  }

  strokeRect(x: number, y: number, w: number, h: number) {
    this.canvas.hudCxt.strokeRect(x, y, w, h);
  }

  drawText(str: string, x: number, y: number) {
    this.canvas.hudCxt.font = "40px sanserif";
    this.canvas.hudCxt.fillText(str, x, y);
  }

  // drawImg(x: number, y: number, w: number, h: number, type: BLOCKS) {
  //   if (type > 6) return;

  //   const imgCords = TextureMapper.getBlockPreviewCords(type, this.textureImg.width, this.textureImg.height);

  //   this.canvas.hudCxt.drawImage(this.textureImg,
  //     imgCords.x, imgCords.y, imgCords.w, imgCords.h,
  //     x, y, w, h,
  //   );
  // }

  private lastStats = "";
  drawStats(camera: Camera) {
    const canvas = this.game.getGameScript(CanvasGameScript);
    const cameraPos = camera.pos.data.map((d) => d.toFixed(2)).join(",");

    const numChunks = this.game.world.getLoadedChunkIds().length;

    const statsElement = document.getElementById("stats")!;
    const statsString = `
      playerPos: ${cameraPos} <br />
      fps: ${canvas.frameRate.toFixed(0)} <br />
      numChunks: ${numChunks}
    `;
    if (this.lastStats !== statsString) {
      statsElement.innerHTML = statsString;
      this.lastStats = statsString;
    }

    // if (this.game.gameController instanceof Quest2Controller) {
    //   const rotVec = new Vector2D([camera.rot.get(0), camera.rot.get(1)]);
    //   rotVec.data = rotVec.data.map((n) => Math.floor(n * 100) / 100);
    //   this.drawText(rotVec.toIndex(), 0, 70);
    // }
  }

  drawBelt() {
    const basic = this.game.getGameScript(BasicUsecase);
    this.eToolbeltItems.forEach((item, index) => {
      if (index === basic.mainPlayer.belt.selectedIndex) {
        item.classList.add("selected");
      } else {
        item.classList.remove("selected");
      }
    });

    const itemDim = this.eToolbeltItems[0].clientHeight;

    const belt = basic.mainPlayer.belt;

    if (!belt) {
      return;
    }

    // draw the icons
    for (let i = 0; i < belt.length; i++) {
      const item = belt.getItem(i);
      if (!item) {
        continue;
      }

      const cords = TextureMapper.getBlockPreviewCords(
        item,
        this.textureImg.width,
        this.textureImg.height
      );
      // Clip the textImage to the cords
      const img = this.textureImg;
      const croppedImg = document.createElement("canvas");
      croppedImg.width = itemDim;
      croppedImg.height = itemDim;
      const ctx = croppedImg.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get 2d context");
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        img,
        cords.x1,
        cords.y1,
        cords.x2 - cords.x1,
        cords.y2 - cords.y1,
        0,
        0,
        croppedImg.width,
        croppedImg.height
      );
      this.eToolbeltItems[
        i
      ].style.backgroundImage = `url(${croppedImg.toDataURL()})`;
      this.eToolbeltItems[i].style.backgroundSize = "contain";
    }
  }

  drawHealthBar() {
    const basic = this.game.getGameScript(BasicUsecase);
    if (!basic.mainPlayer) return;
    const { current, max } = basic.mainPlayer.health;
    const healthPercent = current / max;
    this.eHealthBar.style.width = `${healthPercent * 100}%`;
  }

  hideControls() {
    hide(this.eForwardButton);
    hide(this.eJumpButton);
    hide(this.eUseItemButton);
    hide(this.eUseItemButton2);
  }

  private lastSelected = -1;

  render(camera: Camera) {
    this.clearScreen();
    const basic = this.game.getGameScript(BasicUsecase);

    this.drawStats(camera);

    if (this.lastSelected !== basic.mainPlayer.belt.selectedIndex) {
      this.drawBelt();
      this.lastSelected = basic.mainPlayer.belt.selectedIndex;
    }

    // draw selected items
    this.drawHealthBar();
  }
}
