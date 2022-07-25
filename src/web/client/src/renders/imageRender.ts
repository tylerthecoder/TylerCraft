import { Vector3D, Camera } from "@craft/engine";
import { canvas } from "../canvas";
import ShapeBuilder from "../services/shapeBuilder";
import { RenderData, Renderer } from "./renderer";


// Draws an image at a certain location
export class ImageRenderer extends Renderer {
  private galleryIndex = 0;

  constructor(
    private pos: Vector3D,
    private face: number
  ) {
    super();
    this.setup();
  }

  // draw just one image this is basically just 2 faces
  private setup() {
    // texture is the entire square
    const renData = new RenderData();
    const textureCords = [0, 0, 0, 1, 1, 1, 1, 0];

    renData.pushData({ textureCords })/*  */;
    ShapeBuilder.buildFace(this.face, renData, Vector3D.zero.data, 4);
    this.setBuffers(renData);
  }

  render(camera: Camera): void {
    this.setActiveTexture(canvas.getGalleryTexture(this.galleryIndex));
    this.renderObject(this.pos.data, camera)
  }
}