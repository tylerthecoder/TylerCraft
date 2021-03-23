import { Camera } from "../../src/camera";
import { Vector3D } from "../../src/utils/vector";
import ShapeBuilder from "../services/shapeBuilder";
import TextureService from "../services/textureService";
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

    renData.pushData({ textureCords });
    ShapeBuilder.buildFace(this.face, renData, this.pos.data, 4);
  }

  render(camera: Camera): void {
    this.setActiveTexture(TextureService.getGalleryTexture(this.galleryIndex));
    this.renderObject(this.pos.data, camera)
  }
}