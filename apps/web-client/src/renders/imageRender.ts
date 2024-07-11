import { Vector3D, Camera, IDim } from "@craft/engine";
import { RenderData, Renderer } from "./renderer";
import ShapeBuilder from "../services/shape-builder";
import { WebGlGScript } from "../game-scripts/webgl-gscript";

// Draws an image at a certain location
export class ImageReneCanvasderer extends Renderer {
  private galleryIndex = 0;

  constructor(
    webGlGScript: WebGlGScript,
    private pos: Vector3D,
    private face: number
  ) {
    super(webGlGScript);
    this.setup();
  }

  // draw just one image this is basically just 2 faces
  private setup() {
    // texture is the entire square
    const renData = new RenderData();
    const textureCords = [0, 0, 0, 1, 1, 1, 1, 0];

    renData.pushData({ textureCords }) /*  */;
    ShapeBuilder.buildFace(this.face, renData, Vector3D.zero.data, 4);
    this.setBuffers(renData);
  }

  render(camera: Camera): void {
    this.setActiveTexture(
      this.webGlGScript.getGalleryTexture(this.galleryIndex)
    );
    this.renderObject(this.pos.data as IDim, camera);
  }
}
