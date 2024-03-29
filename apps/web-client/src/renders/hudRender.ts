/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Renderer } from "./renderer";
import { Camera, Vector2D } from "@craft/engine";
import { CanvasProgram } from "../canvas";
import { ClientGame } from "../clientGame";
import TextureMapper from "../textureMapper";
import { IS_MOBILE } from "../app";
import { Quest2Controller } from "../controllers/playerControllers/quest2Controller";

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

  constructor(public canvas: CanvasProgram, public game: ClientGame) {
    super();
    this.textureImg = document.createElement("img");
    this.textureImg.src = "./img/texture_map.png";

    const hudElement = document.getElementById("hud")!;
    hudElement.style.visibility = "visible";

    if (!IS_MOBILE) {
      this.hideControls();
    }

    this.drawBelt();
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
    const cameraPos = camera.pos.data.map(Math.floor).join(",");

    const numChunks = this.game.world.getChunks().length;

    const statsElement = document.getElementById("stats")!;
    const statsString = `
      playerPos: ${cameraPos} <br />
      fps: ${this.game.frameRate.toFixed(0)} <br />
      numChunks: ${numChunks}
    `;
    if (this.lastStats !== statsString) {
      statsElement.innerHTML = statsString;
      this.lastStats = statsString;
    }

    if (this.game.controller instanceof Quest2Controller) {
      const rotVec = new Vector2D([camera.rot.get(0), camera.rot.get(1)]);
      rotVec.data = rotVec.data.map((n) => Math.floor(n * 100) / 100);
      this.drawText(rotVec.toIndex(), 0, 70);
    }
  }

  drawBelt() {
    this.eToolbeltItems.forEach(
      (item, index) => (item.innerHTML = `<h2>${index}</h2>`)
    );

    this.eToolbeltItems.forEach((item, index) => {
      if (index === this.game.mainPlayer?.belt.selectedIndex) {
        item.classList.add("selected");
      } else {
        item.classList.remove("selected");
      }
    });

    const itemDim = this.eToolbeltItems[0].clientHeight;

    // draw the icons
    for (let i = 0; i < 10; i++) {
      const { cords } = TextureMapper.getBlockPreviewCords(1, itemDim, itemDim);
      this.eToolbeltItems[
        i
      ].style.clipPath = `polygon(${cords.x1} ${cords.y1} ${cords.x2} ${cords.y2})`;
    }
  }

  drawHealthBar() {
    if (!this.game.mainPlayer) return;
    const { current, max } = this.game.mainPlayer.health;
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

    this.drawStats(camera);

    if (this.lastSelected !== this.game.mainPlayer.belt.selectedIndex) {
      this.drawBelt();
      this.lastSelected = this.game.mainPlayer.belt.selectedIndex;
    }

    // draw selected items
    this.drawHealthBar();
  }
}
