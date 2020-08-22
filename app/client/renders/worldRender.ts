import { World } from "../../src/world/world";
import { Renderer } from "./renderer";
import { canvas } from "../canvas";
import { ChunkRenderer } from "./chunkRender";
import { HudRenderer } from "./hudRender";
import { CubeRenderer } from "./cubeRender";
import { ClientGame } from "../game";
import { Entity, RenderType } from "../../src/entities/entity";
import { SphereRenderer } from "./sphereRender";
import { CONFIG } from "../../src/constants";
import { Vector2D, Vector } from "../../src/utils/vector";
import { Camera } from "../cameras/camera";


export default class WorldRenderer {
  renderers: Renderer[] = [];
  shouldRenderMainPlayer = false;

  chunkRenderers: Map<string, ChunkRenderer> = new Map();

  constructor(
    private world: World
  ) {
    const hudCanvas = new HudRenderer(canvas);
    this.renderers.push(hudCanvas);
  }

  blockUpdate(chunkId: string) {
    const rendererToUpdate = Array.from(this.chunkRenderers.values()).find(r =>
      r.chunk && r.chunk.uid === chunkId
    );

    if (rendererToUpdate) rendererToUpdate.getBufferData();
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

  renderChunk(chunkPos: Vector2D, camera: Camera) {
    const chunk = this.world.getGeneratedChunk(chunkPos);

    let chunkRenderer = this.chunkRenderers.get(`${chunk.chunkPos[0]},${chunk.chunkPos[1]}`);

    if (!chunkRenderer) {
      chunkRenderer = new ChunkRenderer(chunk);
      this.chunkRenderers.set(`${chunk.chunkPos[0]},${chunk.chunkPos[1]}`, chunkRenderer);
    }

    chunkRenderer.render(camera);
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

      renderer.render(game.camera);
    }

    // render all of the chunks
    // loop through all of the chunks that I would be able to see.
    const cameraXYPos = new Vector2D([
      game.camera.pos[0],
      game.camera.pos[2]]
    );
    const realRenderDistance = CONFIG.chunkSize * CONFIG.renderDistance;
    const cameraChunkPos = this.world.worldPosToChunkPos(new Vector(game.camera.pos));

    for (let i = - CONFIG.renderDistance; i <= CONFIG.renderDistance; i++) {
      for (let j = - CONFIG.renderDistance; j <= CONFIG.renderDistance; j++) {
        const indexVec = new Vector2D([i, j]);
        const chunkPos = cameraChunkPos.add(indexVec);
        const chunkWorldPos = this.world.chunkPosToWorldPos(chunkPos, true);
        const chunkXYPos = new Vector2D([chunkWorldPos.get(0), chunkWorldPos.get(2)]);
        const distAway = cameraXYPos.distFrom(chunkXYPos);

        if (distAway > realRenderDistance) {
          // don't render this chunk because it is outside of the player's view
          continue;
        }

        this.renderChunk(chunkPos, game.camera);
      }
    }



  }


}