import { Renderer } from "./renderer";
import { Camera } from "../cameras/camera";
import { CanvasProgram } from "../canvas";



export class HudRenderer extends Renderer {
  sw = window.innerWidth;
  sh = window.innerHeight;

  constructor(
    public canvas: CanvasProgram,
  ) {super()}

  drawRect(x: number, y: number, w: number, h: number) {
    this.canvas.hudCxt.fillRect(x,y,w,h)
  }


  render(camera: Camera) {
    const crossHairWidth = 10;
    const crossHairHeight = 50;

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

  }

}