import { Camera, Game, PlayerActionService } from "@craft/engine";
import TextureMapper from "../textureMapper";
import { IS_MOBILE } from "../app";
import { CanvasGameScript } from "../game-scripts/canvas-gscript";
import { getEleOrError, hideElement } from "../utils";
import { GameScript } from "@craft/engine/game-script";
import { BasicGScript } from "./basic-gscript";
import { GameMenu } from "../renders/gameMenuRender";
import React from "react";
import ReactDOM from "react-dom";

export class HudGScript extends GameScript {
  name = "hud";

  textureImg: HTMLImageElement;
  private eHealthBar = getEleOrError<HTMLDivElement>("healthBar");
  private eToolbeltItems = Array.from(
    document.querySelectorAll(".toolbelt-item")
  ) as HTMLElement[];
  private eUseItemButton = getEleOrError("useItemButton");
  private eUseItemButton2 = getEleOrError("useItemButton2");
  private eForwardButton = getEleOrError("forwardButton");
  private eJumpButton = getEleOrError("jumpButton");
  private eStats = getEleOrError("stats");
  public eHud = getEleOrError<HTMLDivElement>("hud");
  public eMenuContainer = getEleOrError<HTMLDivElement>("menuContainer");

  public eHudCanvas = getEleOrError<HTMLCanvasElement>("hudCanvas");
  public hudCxt: CanvasRenderingContext2D;

  private lastSelected = -1;

  constructor(
    game: Game,
    private basicGScript: BasicGScript,
    private canvasGScript: CanvasGameScript,
    private playerActionService: PlayerActionService
  ) {
    super(game);

    // Show the things!
    ReactDOM.render(
      React.createElement(GameMenu, { game: game }),
      this.eMenuContainer
    );

    this.eHud.style.visibility = "visible";

    this.textureImg = document.createElement("img");
    this.textureImg.src = "./img/texture_map.png";
    document.body.appendChild(this.textureImg);

    const getCanvasDimensions = () => {
      this.eHudCanvas.height = window.innerHeight;
      this.eHudCanvas.width = window.innerWidth;
    };
    window.addEventListener("resize", getCanvasDimensions);

    const hudContext = this.eHudCanvas.getContext("2d");
    if (!hudContext) {
      throw new Error("Could not get hud 2d context");
    }
    this.hudCxt = hudContext;

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
    this.hudCxt.clearRect(0, 0, sw, sh);
  }

  drawRect(x: number, y: number, w: number, h: number) {
    this.hudCxt.fillRect(x, y, w, h);
  }

  strokeRect(x: number, y: number, w: number, h: number) {
    this.hudCxt.strokeRect(x, y, w, h);
  }

  drawText(str: string, x: number, y: number) {
    this.hudCxt.font = "40px sanserif";
    this.hudCxt.fillText(str, x, y);
  }

  private lastStats = "";
  drawStats() {
    const cameraPos = this.basicGScript.mainPlayer.pos.data
      .map((d) => d.toFixed(2))
      .join(",");
    const numChunks = this.game.world.getLoadedChunkIds().length;

    const statsString = `
      playerPos: ${cameraPos} <br />
      fps: ${this.canvasGScript.frameRate.toFixed(0)} <br />
      numChunks: ${numChunks}
    `;

    if (this.lastStats !== statsString) {
      this.eStats.innerHTML = statsString;
      this.lastStats = statsString;
    }

    // if (this.game.gameController instanceof Quest2Controller) {
    //   const rotVec = new Vector2D([camera.rot.get(0), camera.rot.get(1)]);
    //   rotVec.data = rotVec.data.map((n) => Math.floor(n * 100) / 100);
    //   this.drawText(rotVec.toIndex(), 0, 70);
    // }
  }

  update(_delta: number): void {
    this.clearScreen();

    this.drawStats();

    if (this.lastSelected !== this.basicGScript.mainPlayer.belt.selectedIndex) {
      this.drawBelt();
      this.lastSelected = this.basicGScript.mainPlayer.belt.selectedIndex;
    }

    this.drawHealthBar();
  }

  drawBelt() {
    this.eToolbeltItems.forEach((item, index) => {
      if (index === this.basicGScript.mainPlayer.belt.selectedIndex) {
        item.classList.add("selected");
      } else {
        item.classList.remove("selected");
      }
    });

    const itemDim = this.eToolbeltItems[0].clientHeight;

    const belt = this.basicGScript.mainPlayer.belt;

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
    if (!this.basicGScript.mainPlayer) return;
    const { current, max } = this.basicGScript.mainPlayer.health;
    const healthPercent = current / max;
    this.eHealthBar.style.width = `${healthPercent * 100}%`;
  }

  hideControls() {
    hideElement(this.eForwardButton);
    hideElement(this.eJumpButton);
    hideElement(this.eUseItemButton);
    hideElement(this.eUseItemButton2);
  }
}
