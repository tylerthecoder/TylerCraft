import { RenderData, Renderer } from "./renderer";
import { Camera, Entity, IDim } from "@craft/engine";
import TextureMapper from "../textureMapper";
import ShapeBuilder from "../services/shape-builder";
import { WebGlGScript } from "../game-scripts/webgl-gscript";

export class CubeRenderer extends Renderer {
  constructor(public webGlGScript: WebGlGScript, public entity: Entity) {
    super(webGlGScript);
    this.setActiveTexture(this.webGlGScript.textureAtlas);
    this.setup();
  }

  render(camera: Camera): void {
    this.renderObject(this.entity.pos.data as IDim, camera);
  }

  private setup() {
    const textureCords = TextureMapper.getTextureCordsEntity().flat();

    const renData = new RenderData();
    renData.pushData({ textureCords });

    ShapeBuilder.buildBox((vec) => vec, renData);

    this.setBuffers(renData);
  }
}
