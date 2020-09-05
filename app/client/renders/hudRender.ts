import { Renderer } from "./renderer";
import { Camera } from "../cameras/camera";
import { CanvasProgram } from "../canvas";
import { ClientGame } from "../clientGame";
import { Vector3D, Vector2D } from "../../src/utils/vector";


export class HudRenderer extends Renderer {
  sw = window.innerWidth;
  sh = window.innerHeight;

  constructor(
    public canvas: CanvasProgram,
    public game: ClientGame,
  ) {super()}

  clearScreen() {
    this.canvas.hudCxt.clearRect(0, 0, this.sw, this.sh);
  }

  drawRect(x: number, y: number, w: number, h: number) {
    this.canvas.hudCxt.fillRect(x,y,w,h)
  }

  drawText(str: string, x: number, y: number) {
    this.canvas.hudCxt.font = "40px sanserif"
    this.canvas.hudCxt.fillText(str, x, y);
  }

  render(camera: Camera) {
    const crossHairWidth = 10;
    const crossHairHeight = 50;

    this.clearScreen();

    this.canvas.hudCxt.fillStyle = "red";

    // draw the vertical cross hair
    this.drawRect(
      (this.sw/2) - crossHairWidth / 2,
      (this.sh /2) - crossHairHeight / 2,
      crossHairWidth,
      crossHairHeight
    )

    // draw the vertical cross hair
    this.drawRect(
      (this.sw/2) - crossHairHeight / 2,
      (this.sh /2) -  crossHairWidth/ 2,
      crossHairHeight,
      crossHairWidth,
    )


    const camerPos = camera.pos.map(Math.floor).join(",")
    this.drawText(camerPos, 0, 30);


    const rotVec = new Vector2D([camera.rot[0], camera.rot[1]]);
    rotVec.data = rotVec.data.map(n => Math.floor(n * 100) / 100);
    this.drawText(rotVec.toString(), 0, 70);



  }

}