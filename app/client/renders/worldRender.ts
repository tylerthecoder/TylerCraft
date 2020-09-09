import { World } from "../../src/world/world";
import { Renderer } from "./renderer";
import { canvas } from "../canvas";
import { ChunkRenderer } from "./chunkRender";
import { HudRenderer } from "./hudRender";
import { CubeRenderer } from "./cubeRender";
import { ClientGame } from "../clientGame";
import { Entity, RenderType } from "../../src/entities/entity";
import { SphereRenderer } from "./sphereRender";
import { CONFIG } from "../../src/constants";
import { Vector2D, Vector3D } from "../../src/utils/vector";
import { Camera } from "../cameras/camera";
import { Chunk } from "../../src/world/chunk";

export default class WorldRenderer {
  renderers: Renderer[] = [];
  shouldRenderMainPlayer = false;

  chunkRenderers: Map<string, ChunkRenderer> = new Map();

  constructor(
    private world: World,
    game: ClientGame,
  ) {
    const hudCanvas = new HudRenderer(canvas, game);
    this.renderers.push(hudCanvas);
  }

  blockUpdate(chunkId: string) {
    const chunkToUpdate = this.chunkRenderers.get(chunkId);
    if (chunkToUpdate) chunkToUpdate.getBufferData(this.world);
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
    const chunkData = this.world.getGeneratedChunk(chunkPos);
    let chunkRenderer = this.chunkRenderers.get(chunkPos.toString());

    if (chunkData.new) {
      // maybe do this on another thread (worker)
      this.blockUpdate(chunkPos.add(new Vector2D([0,1])).toString());
      this.blockUpdate(chunkPos.add(new Vector2D([1,0])).toString());
      this.blockUpdate(chunkPos.add(new Vector2D([0,-1])).toString());
      this.blockUpdate(chunkPos.add(new Vector2D([-1,0])).toString());
    }

    if (!chunkRenderer) {
      chunkRenderer = new ChunkRenderer(chunkData.chunk, this.world);
      this.chunkRenderers.set(chunkPos.toString(), chunkRenderer);
    }

    chunkRenderer.render(camera);
  }

  render(game: ClientGame) {
    canvas.clearCanvas();

    const camera = game.camera;

    for (const renderer of this.renderers) {
      if (renderer instanceof CubeRenderer) {
        const isMainPlayer = renderer.entity === game.mainPlayer;

        if (isMainPlayer && !this.shouldRenderMainPlayer) {
          continue;
        }
      }

      renderer.render(camera);
    }

    // loop through all of the chunks that I would be able to see.

    const cameraXYPos = new Vector2D([
      camera.pos.get(0),
      camera.pos.get(2),
    ]);

    const realRenderDistance = CONFIG.terrain.chunkSize * CONFIG.renderDistance;
    const cameraChunkPos = this.world.worldPosToChunkPos(camera.pos);

    const cameraRotNorm = camera.rotCart.normalize();

    // this will hold the coords of ever chunk that was rendered.
    const renderedSet = new Set<string>();

    const skippedChunkPos = new Set<Vector2D>();

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

        // check if you are facing that right way to see the chunk
        const diffChunkCamera = camera.pos.sub(chunkWorldPos).normalize();
        const dist = diffChunkCamera.distFrom(cameraRotNorm);

        if (dist > CONFIG.fovFactor) {
          // don't render this chunk because the player isn't looking at it
          skippedChunkPos.add(chunkPos);
          continue;
        }

        renderedSet.add(chunkPos.toString());

        this.renderChunk(chunkPos, camera);
      }
    }

    for (const chunkPos of skippedChunkPos.values()) {
      // check to see if any of the neighboring chunks were rendered
      // this is slightly inefficent but it makes sure the user sees all chunks.
      // since we are checking to see if the user can see the middle of the chunk we miss some chunks
      // that the user sees the edge of. This fixes that
      let stillShouldntRender = true;
      for (let k = -1; k <= 1; k += 1) {
        for (let l = -1; l <= 1; l += 1) {
          const indexVec = new Vector2D([k, l]);
          const chunkPosToCheck = chunkPos.add(indexVec);
          if (renderedSet.has(chunkPosToCheck.toString())) {
            stillShouldntRender = false;
          }
        }
      }

      if (!stillShouldntRender) {
        this.renderChunk(chunkPos, camera);
      }
    }

    // This is for when you are looking directly at the ground.
    // Since I only check when the user can't see the center of a chunk, if you are looking directly at the ground you can't
    // see the chunk. Thus this renders the 9 chunks below you.
    for (let k = -1; k <= 1; k += 1) {
      for (let l = -1; l <= 1; l += 1) {
        const indexVec = new Vector2D([k, l]);
        const chunkPos = cameraChunkPos.add(indexVec);
        if (!renderedSet.has(chunkPos.toString()))
          this.renderChunk(chunkPos, camera);
      }
    }

  }


}