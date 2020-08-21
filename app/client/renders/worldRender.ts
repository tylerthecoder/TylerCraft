import { World } from "../../src/world/world";
import { Renderer } from "./renderer";
import { canvas } from "../canvas";
import { ChunkRenderer } from "./chunkRender";
import { HudRenderer } from "./hudRender";
import { CubeRenderer } from "./cubeRender";
import { ClientGame } from "../game";
import { Entity, RenderType } from "../../src/entities/entity";
import { SphereRenderer } from "./sphereRender";
import { arrayDist } from "../../src/utils";
import { CONFIG } from "../../src/constants";


export default class WorldRenderer {
  renderers: Renderer[] = [];
  shouldRenderMainPlayer = false;

  constructor(
    private world: World
  ) {
    this.world.chunks.forEach(chunk => {
      const renderer = new ChunkRenderer(chunk);
      this.renderers.push(renderer);
    });

    const hudCanvas = new HudRenderer(canvas);
    this.renderers.push(hudCanvas);
  }

  blockUpdate(chunkId: string) {
    const rendererToUpdate = this.renderers.find(r =>
      (r as ChunkRenderer).chunk && (r as ChunkRenderer).chunk.uid === chunkId
    );

    if (rendererToUpdate) (rendererToUpdate as ChunkRenderer).getBufferData();

  }

  addEntity(entity: Entity) {
    if (entity.renderType === RenderType.CUBE) {
      const renderer = new CubeRenderer(entity);
      this.renderers.push(renderer);
    } else if (entity.renderType === RenderType.SPHERE) {
      const renderer = new SphereRenderer(entity);
      this.renderers.push(renderer);
    }
  }

  render(game: ClientGame) {
    canvas.clearCanvas();

    for (const renderer of this.renderers) {

      if (renderer instanceof CubeRenderer) {
        const isMainPlayer = renderer.entity === game.mainPlayer;

        if (isMainPlayer && !this.shouldRenderMainPlayer) {
          continue;
        }
      }

      if (renderer instanceof ChunkRenderer) {
        const chunk = renderer.chunk;

        // determine if we should render this chunk

        // find dist between this chunk and mainplayer and see is less then the render distance

        const chunkXYPos = [chunk.pos[0] + CONFIG.chunkSize / 2, chunk.pos[2] + CONFIG.chunkSize / 2];
        const cameraXYPos = [game.camera.pos[0], game.camera.pos[2]];

        const distAway = arrayDist(chunkXYPos, cameraXYPos);

        // assuming blocks are 1 wide, find the dist away in real units
        const realRenderDistance = CONFIG.chunkSize * CONFIG.renderDistance;

        if (distAway > realRenderDistance) {
          // don't render this chunk because it is outside of the player's view
          continue;
        }
      }

      renderer.render(game.camera);
    }
  }


}