import { Renderer } from "./renderer";
import { Camera } from "../cameras/camera";
import { CanvasProgram } from "../canvas";
import { ClientGame } from "../clientGame";
import { Vector3D, Vector2D } from "../../src/utils/vector";
import { BLOCKS } from "../../src/blockdata";
import TextureMapper from "../textureMapper";


export class HudRenderer extends Renderer {
  sw = window.innerWidth;
  sh = window.innerHeight;

  textureImg: HTMLImageElement;

  constructor(
    public canvas: CanvasProgram,
    public game: ClientGame,
  ) {
    super()
    this.textureImg = document.createElement("img");
    this.textureImg.src = "./img/texture_map.png";
  }

  clearScreen() {
    this.canvas.hudCxt.clearRect(0, 0, this.sw, this.sh);
  }

  drawRect(x: number, y: number, w: number, h: number) {
    this.canvas.hudCxt.fillRect(x,y,w,h)
  }

  strokeRect(x: number, y: number, w: number, h: number) {
    this.canvas.hudCxt.strokeRect(x,y,w,h)
  }

  drawText(str: string, x: number, y: number) {
    this.canvas.hudCxt.font = "40px sanserif"
    this.canvas.hudCxt.fillText(str, x, y);
  }

  drawImg(x: number, y: number, w: number, h: number, type: BLOCKS) {
    if (type > 6) return;

    const imgCords = TextureMapper.getBlockPreviewCords(type, this.textureImg.width, this.textureImg.height);

    this.canvas.hudCxt.drawImage(this.textureImg,
      imgCords.x, imgCords.y, imgCords.w, imgCords.h,
      x, y, w, h,
    );
  }


  drawCrosshairs() {
    this.canvas.hudCxt.fillStyle = "red";
    const crossHairWidth = 3;
    const crossHairHeight = 40;

    // draw the vertical cross hair
    this.drawRect(
      (this.sw/2) - crossHairWidth / 2,
      (this.sh /2) - crossHairHeight / 2,
      crossHairWidth,
      crossHairHeight
    );

    // draw the vertical cross hair
    this.drawRect(
      (this.sw/2) - crossHairHeight / 2,
      (this.sh /2) -  crossHairWidth/ 2,
      crossHairHeight,
      crossHairWidth,
    );
  }

  render(camera: Camera) {

    this.clearScreen();

    this.drawCrosshairs();

    const cameraPos = camera.pos.data.map(Math.floor).join(",")
    this.drawText(cameraPos, 0, 30);


    const rotVec = new Vector2D([camera.rot[0], camera.rot[1]]);
    rotVec.data = rotVec.data.map(n => Math.floor(n * 100) / 100);
    this.drawText(rotVec.toString(), 0, 70);


    // draw selected items
    const numOfBoxes = 10;
    const boxDimension = 70;

    for (let i = 0; i < numOfBoxes; i++) {
      const x = (i - 5) * boxDimension + this.sw /2;
      const y = this.sh - boxDimension - 10;
      const w = boxDimension;
      const h = boxDimension;

      if (this.game.selectedBlock === i) {
        this.canvas.hudCxt.lineWidth = 10;
        this.canvas.hudCxt.strokeStyle = "red";
      } else {
        this.canvas.hudCxt.lineWidth = 2;
        this.canvas.hudCxt.strokeStyle = "white";
      }


      this.drawImg(x, y, w, h, i as BLOCKS);
      this.strokeRect(x, y, w, h)
    }

    // draw health bar

    const healthBarWidth = 400;
    const healthBarHeight = 30;
    const healthBarY = 100;
    this.canvas.hudCxt.strokeStyle = "black";
    this.strokeRect((this.sw / 2) - healthBarWidth / 2, this.sh - (healthBarY + healthBarHeight), healthBarWidth, healthBarHeight)
    this.canvas.hudCxt.fillStyle = "red";
    this.drawRect((this.sw / 2) - healthBarWidth / 2, this.sh - (healthBarY + healthBarHeight), healthBarWidth * this.game.mainPlayer.health.current / this.game.mainPlayer.health.max, healthBarHeight);

  }

}