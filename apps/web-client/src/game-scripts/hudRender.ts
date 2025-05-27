import { GameScript } from "@craft/engine";
import { CanvasGameScript } from "../game-scripts/canvas-gscript";
import { getEleOrError, hideElement, IS_MOBILE } from "../utils";
import { GameMenu } from "../renders/gameMenuRender";
import React from "react";
import ReactDOM from "react-dom";
import { Game, Item, Player } from "@craft/rust-world";
import TextureMapper from "../textureMapper";

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
    private canvasGScript: CanvasGameScript,
    private mainPlayerUid: number
  ) {
    super(game);

    // Show the things!
    ReactDOM.render(
      React.createElement(GameMenu, { game: game }),
      this.eMenuContainer
    );

    this.eHud.style.visibility = "visible";

    this.textureImg = document.createElement("img");
    this.textureImg.src = "/img/texture_map.png";
    this.textureImg.style.display = "none";
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
      // this.drawBelt();
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
  drawStats(player: Player) {
    const cameraPos =
      "X: " +
      player.pos.x.toFixed(2) +
      ", Y: " +
      player.pos.y.toFixed(2) +
      ", Z: " +
      player.pos.z.toFixed(2);

    const cameraRot =
      "Theta: " +
      player.rot.theta.toFixed(2) +
      ", Phi: " +
      player.rot.phi.toFixed(2);
    // const numChunks = this.game.world.getLoadedChunkIds().length;

    const statsString = `
      playerPos: ${cameraPos} <br />
      playerRot: ${cameraRot} <br />
      fps: ${this.canvasGScript.frameRate.toFixed(0)} <br />
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
    const player = this.game.entities.get_entity_as_player(this.mainPlayerUid);
    if (!player) {
      console.log("HudGScript: Player not found", this.mainPlayerUid);
      return;
    }

    this.clearScreen();

    this.drawStats(player);

    this.drawBelt(player);

    // this.drawHealthBar();
  }

  drawBelt(player: Player) {
    const belt = player.belt;

    if (belt.selected_item === this.lastSelected) {
      return;
    }

    this.lastSelected = belt.selected_item;

    this.eToolbeltItems.forEach((item, index) => {
      if (index === belt.selected_item) {
        item.classList.add("selected");
      } else {
        item.classList.remove("selected");
      }
    });

    const itemDim = this.eToolbeltItems[0].clientHeight;

    // draw the icons
    for (let i = 0; i < belt.get_num_items(); i++) {
      const item: Item = belt.get_item_js(i);
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

  // drawHealthBar() {
  //   if (!this.basicGScript.mainPlayer) return;
  //   const { current, max } = this.basicGScript.mainPlayer.health;
  //   const healthPercent = current / max;
  //   this.eHealthBar.style.width = `${healthPercent * 100}%`;
  // }

  hideControls() {
    hideElement(this.eForwardButton);
    hideElement(this.eJumpButton);
    hideElement(this.eUseItemButton);
    hideElement(this.eUseItemButton2);
  }
}
