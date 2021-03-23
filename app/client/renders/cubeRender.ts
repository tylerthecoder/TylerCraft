import { RenderData, Renderer } from "./renderer";
import { Camera } from "../../src/camera";
import { Entity } from "../../src/entities/entity";
import { arrayMul } from "../../src/utils";
import TextureMapper from "../textureMapper";
import TextureService from "../services/textureService";
import ShapeBuilder from "../services/shapeBuilder";

export class CubeRenderer extends Renderer {
  constructor(public entity: Entity) {
    super();
    this.setActiveTexture(TextureService.textureAtlas);
    this.setup();
  }

  render(camera: Camera): void {
    this.renderObject(this.entity.pos.data, camera);
  }

  private setup() {
    const textureCords = TextureMapper.getTextureCordsEntity().flat();

    const renData = new RenderData();
    renData.pushData({ textureCords });

    ShapeBuilder.buildBox(vec => vec, renData);

    this.setBuffers(renData);
  }
}
